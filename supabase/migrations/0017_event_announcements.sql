-- =============================================================================
-- Zuvio — Migração 0017: avisos gerais do organizador
-- =============================================================================
-- Diferente do chat (`chat_messages` — só libera depois do quórum,
-- qualquer participante confirmado escreve), `event_announcements` é
-- um mural de avisos: só o ORGANIZADOR posta, e funciona desde o
-- início (não espera quórum) — é o canal pra ele avisar mudança de
-- horário/local etc. antes mesmo de ter gente confirmada o bastante
-- pra abrir o chat de verdade.
-- =============================================================================

create table event_announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  criado_em timestamptz not null default now()
);

create index event_announcements_event_idx on event_announcements (event_id, criado_em);

alter table event_announcements enable row level security;

-- Mesma audiência de quem pode ver o evento em detalhe: o organizador
-- ou quem tem compromisso não cancelado — reaproveita `is_event_creator`/
-- `is_event_participant` (0001), sem risco de recursão.
create policy "Organizador ou participantes leem os avisos"
  on event_announcements for select
  to authenticated
  using (
    is_event_creator(event_id, auth.uid())
    or is_event_participant(event_id, auth.uid())
  );

create policy "Só o organizador posta avisos"
  on event_announcements for insert
  to authenticated
  with check (autor_id = auth.uid() and is_event_creator(event_id, auth.uid()));

create policy "Organizador apaga o próprio aviso"
  on event_announcements for delete
  to authenticated
  using (is_event_creator(event_id, auth.uid()));

-- Sem isso, a assinatura de Realtime no app fica esperando pra sempre
-- (mesmo bug já documentado na migração 0011 pro chat).
alter publication supabase_realtime add table event_announcements;
