-- =============================================================================
-- Zuvio — Migração 0013: privacidade de Amigos, capa do evento, fotos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Corrige a privacidade de eventos modalidade "Amigos"
-- -----------------------------------------------------------------------------
-- Até aqui, a política de SELECT de `events` só escondia eventos
-- Restritos — "Amigos" aparecia igual a "Aberta a estranhos" para
-- qualquer pessoa no feed público, o que não faz sentido para uma
-- modalidade que existe justamente para ser vista só pelos amigos do
-- organizador. Corrigido usando `are_friends` (já existente).
-- -----------------------------------------------------------------------------

drop policy if exists "Descoberta pública de eventos não-restritos" on events;

create policy "Descoberta pública respeitando a modalidade"
  on events for select
  to authenticated
  using (
    modalidade in ('estranhos', 'hibrida')
    or criador_id = auth.uid()
    or is_event_participant(id, auth.uid())
    or has_redeemed_invite(id, auth.uid())
    or (modalidade = 'amigos' and are_friends(criador_id, auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- 2) Capa do evento (editável pelo organizador)
-- -----------------------------------------------------------------------------

alter table events add column capa_url text;

-- -----------------------------------------------------------------------------
-- 3) Fotos postadas por participantes
-- -----------------------------------------------------------------------------

create type foto_visibilidade as enum ('evento', 'publica');

create table event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  foto_url text not null,
  visibilidade foto_visibilidade not null default 'evento',
  criado_em timestamptz not null default now()
);

create index event_photos_event_idx on event_photos (event_id, criado_em);

alter table event_photos enable row level security;

create policy "Ver fotos públicas, ou do evento se for participante/organizador"
  on event_photos for select
  to authenticated
  using (
    visibilidade = 'publica'
    or is_event_creator(event_id, auth.uid())
    or is_event_participant(event_id, auth.uid())
  );

create policy "Participante confirmado ou organizador posta foto"
  on event_photos for insert
  to authenticated
  with check (
    autor_id = auth.uid()
    and (is_event_creator(event_id, auth.uid()) or is_event_participant(event_id, auth.uid()))
  );

create policy "Autor da foto ou organizador do evento remove"
  on event_photos for delete
  to authenticated
  using (autor_id = auth.uid() or is_event_creator(event_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- 4) Storage: bucket para capas e fotos
-- -----------------------------------------------------------------------------
-- NOTA DE SEGURANÇA: este bucket é público — qualquer um com a URL
-- exata de um arquivo consegue abri-lo direto, sem passar pela RLS de
-- `event_photos`. Isso é aceitável para o MVP porque os nomes de
-- arquivo são UUIDs (não adivinháveis) e a listagem/descoberta de
-- fotos continua controlada pela tabela `event_photos` — mas uma foto
-- marcada como "restrita ao evento" não é criptograficamente privada,
-- só "não listada" para quem não é participante. Um endurecimento
-- futuro (bucket privado + signed URLs) resolveria isso por completo.

insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;

create policy "Qualquer autenticado envia arquivo em event-media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-media');

create policy "Leitura pública de event-media"
  on storage.objects for select
  using (bucket_id = 'event-media');

create policy "Autor remove o próprio arquivo em event-media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-media' and owner = auth.uid());
