import { supabase } from "../client";
import type { Database } from "../database.types";

type InviteRow = Database["public"]["Tables"]["invites"]["Row"];

export interface InviteRecord {
  id: string;
  eventId: string;
  codigo: string;
  uso: "unico" | "multiplo";
  usadoPor: string[];
}

const toInvite = (row: InviteRow): InviteRecord => ({
  id: row.id,
  eventId: row.event_id,
  codigo: row.codigo,
  uso: row.uso,
  usadoPor: row.usado_por,
});

export const InvitesRepository = {
  /**
   * Cria um convite para o evento. `usadoPorDireto` pré-preenche quem
   * já tem acesso garantido na hora (amigos selecionados diretamente
   * na criação) — o mesmo `codigo` também pode ser compartilhado como
   * link: qualquer um que resgatar (via `redeem`) é adicionado à mesma
   * lista depois.
   */
  async create(input: {
    eventId: string;
    criadoPor: string;
    uso: "unico" | "multiplo";
    expiraEmISO: string | null;
    usadoPorDireto?: string[];
  }): Promise<InviteRecord> {
    const { data, error } = await supabase
      .from("invites")
      .insert({
        event_id: input.eventId,
        criado_por: input.criadoPor,
        uso: input.uso,
        expira_em: input.expiraEmISO,
        usado_por: input.usadoPorDireto ?? [],
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toInvite(data);
  },

  async getForEvent(eventId: string): Promise<InviteRecord | null> {
    const { data, error } = await supabase
      .from("invites")
      .select("*")
      .eq("event_id", eventId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toInvite(data) : null;
  },

  /** Retorna o event_id do convite resgatado. */
  async redeem(codigo: string): Promise<string> {
    const { data, error } = await supabase.rpc("redeem_invite", { p_codigo: codigo });
    if (error) throw new Error(error.message);
    return data;
  },
};
