-- =============================================================================
-- Zuvio — Migração 0007: integração com Google Calendar
-- =============================================================================
-- O token de acesso do Google expira em ~1h — para criar/atualizar
-- eventos na agenda depois disso, é preciso renovar o access_token
-- usando o refresh_token, o que exige o Client Secret do Google (nunca
-- pode ficar no cliente). Por isso essa renovação roda numa Edge
-- Function (`supabase/functions/sync-google-calendar`), não no
-- navegador — o cliente só entrega SUPABASE_URL/ANON_KEY, nunca
-- segredo nenhum do Google.
-- =============================================================================

create table google_tokens (
  user_id uuid primary key references profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  atualizado_em timestamptz not null default now()
);

alter table google_tokens enable row level security;

-- Nenhuma policy de SELECT/INSERT/UPDATE direta para o cliente — só a
-- Edge Function (usando a service_role key, que ignora RLS) lê/escreve
-- aqui. Isso evita que o token de acesso do Google fique exposto nem
-- para o próprio dono via API REST direta. Nenhuma policy = nenhum
-- acesso via `anon`/`authenticated`, só via service_role.

alter table commitments add column google_calendar_event_id text;
