// supabase/functions/sync-google-calendar/index.ts
//
// Por que isso precisa ser uma Edge Function (e não código direto no
// navegador):
//   1. Renovar o access_token do Google exige o Client Secret — um
//      segredo que NUNCA pode existir no código do cliente.
//   2. A tabela `google_tokens` não tem nenhuma policy de RLS para o
//      cliente (ver migração 0007) — só o service_role (que só existe
//      aqui, no servidor) consegue ler/escrever nela.
//
// Deploy: `supabase functions deploy sync-google-calendar`
// Secrets necessários (supabase secrets set NOME=valor):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente
// no ambiente de toda Edge Function do projeto.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Identifica quem está chamando a função a partir do JWT enviado pelo cliente. */
async function getCallingUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao renovar token do Google: ${await response.text()}`);
  }
  return response.json() as Promise<{ access_token: string; expires_in: number }>;
}

/** Garante um access_token válido para o usuário, renovando se necessário. */
async function ensureValidAccessToken(userId: string): Promise<string | null> {
  const { data: tokenRow } = await adminClient
    .from("google_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow) return null;

  const expiresAt = new Date(tokenRow.expires_at).getTime();
  const stillValid = expiresAt - Date.now() > 60_000; // margem de 1 minuto
  if (stillValid) return tokenRow.access_token;

  if (!tokenRow.refresh_token) return null;

  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await adminClient
    .from("google_tokens")
    .update({ access_token: refreshed.access_token, expires_at: newExpiresAt })
    .eq("user_id", userId);

  return refreshed.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const userId = await getCallingUserId(req);
  if (!userId) return jsonResponse({ error: "Não autenticado" }, 401);

  const body = await req.json();
  const { action } = body;

  try {
    if (action === "store_tokens") {
      const { access_token, refresh_token, expires_in } = body;
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      await adminClient.from("google_tokens").upsert({
        user_id: userId,
        access_token,
        refresh_token: refresh_token ?? undefined,
        expires_at: expiresAt,
        atualizado_em: new Date().toISOString(),
      });

      return jsonResponse({ ok: true });
    }

    if (action === "sync_event") {
      const { commitment_id } = body;

      const { data: commitment } = await adminClient
        .from("commitments")
        .select("*, events(*)")
        .eq("id", commitment_id)
        .eq("user_id", userId) // só sincroniza o próprio compromisso
        .single();

      if (!commitment) return jsonResponse({ error: "Compromisso não encontrado" }, 404);

      const accessToken = await ensureValidAccessToken(userId);
      if (!accessToken) {
        return jsonResponse(
          { synced: false, reason: "Conta Google não conectada ou sem permissão de agenda." },
          200
        );
      }

      const event = commitment.events;
      const startISO = event.data_hora;
      const endISO = new Date(new Date(event.data_hora).getTime() + 2 * 60 * 60 * 1000).toISOString();

      const calendarEvent = {
        summary: event.titulo,
        description: event.descricao,
        location: event.endereco,
        start: { dateTime: startISO },
        end: { dateTime: endISO },
      };

      const method = commitment.google_calendar_event_id ? "PATCH" : "POST";
      const url = commitment.google_calendar_event_id
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${commitment.google_calendar_event_id}`
        : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

      const googleResponse = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      });

      if (!googleResponse.ok) {
        return jsonResponse(
          { synced: false, reason: `Erro do Google Calendar: ${await googleResponse.text()}` },
          200
        );
      }

      const created = await googleResponse.json();

      if (!commitment.google_calendar_event_id) {
        await adminClient
          .from("commitments")
          .update({ google_calendar_event_id: created.id })
          .eq("id", commitment_id);
      }

      return jsonResponse({ synced: true, google_calendar_event_id: created.id });
    }

    if (action === "remove_event") {
      const { commitment_id } = body;

      const { data: commitment } = await adminClient
        .from("commitments")
        .select("*")
        .eq("id", commitment_id)
        .eq("user_id", userId)
        .single();

      if (!commitment?.google_calendar_event_id) {
        return jsonResponse({ removed: false });
      }

      const accessToken = await ensureValidAccessToken(userId);
      if (!accessToken) return jsonResponse({ removed: false });

      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${commitment.google_calendar_event_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );

      await adminClient
        .from("commitments")
        .update({ google_calendar_event_id: null })
        .eq("id", commitment_id);

      return jsonResponse({ removed: true });
    }

    // O organizador nunca passa pelo fluxo de "comprometer-se" no
    // próprio evento (não tem linha em `commitments`), então precisa de
    // uma ação separada, operando direto sobre `events` em vez de
    // `commitments`. Não mexe em vagas_confirmadas/quórum.
    if (action === "sync_organizer_event") {
      const { event_id } = body;

      const { data: event } = await adminClient
        .from("events")
        .select("*")
        .eq("id", event_id)
        .eq("criador_id", userId) // só o próprio organizador sincroniza
        .single();

      if (!event) return jsonResponse({ error: "Evento não encontrado" }, 404);

      const accessToken = await ensureValidAccessToken(userId);
      if (!accessToken) {
        return jsonResponse(
          { synced: false, reason: "Conta Google não conectada ou sem permissão de agenda." },
          200
        );
      }

      const startISO = event.data_hora;
      const endISO = new Date(new Date(event.data_hora).getTime() + 2 * 60 * 60 * 1000).toISOString();

      const calendarEvent = {
        summary: event.titulo,
        description: event.descricao,
        location: event.endereco,
        start: { dateTime: startISO },
        end: { dateTime: endISO },
      };

      const method = event.organizador_google_calendar_event_id ? "PATCH" : "POST";
      const url = event.organizador_google_calendar_event_id
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.organizador_google_calendar_event_id}`
        : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

      const googleResponse = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      });

      if (!googleResponse.ok) {
        return jsonResponse(
          { synced: false, reason: `Erro do Google Calendar: ${await googleResponse.text()}` },
          200
        );
      }

      const created = await googleResponse.json();

      if (!event.organizador_google_calendar_event_id) {
        await adminClient
          .from("events")
          .update({ organizador_google_calendar_event_id: created.id })
          .eq("id", event_id);
      }

      return jsonResponse({ synced: true, google_calendar_event_id: created.id });
    }

    if (action === "remove_organizer_event") {
      const { event_id } = body;

      const { data: event } = await adminClient
        .from("events")
        .select("*")
        .eq("id", event_id)
        .eq("criador_id", userId)
        .single();

      if (!event?.organizador_google_calendar_event_id) {
        return jsonResponse({ removed: false });
      }

      const accessToken = await ensureValidAccessToken(userId);
      if (!accessToken) return jsonResponse({ removed: false });

      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.organizador_google_calendar_event_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );

      await adminClient
        .from("events")
        .update({ organizador_google_calendar_event_id: null })
        .eq("id", event_id);

      return jsonResponse({ removed: true });
    }

    return jsonResponse({ error: "Ação desconhecida" }, 400);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
});
