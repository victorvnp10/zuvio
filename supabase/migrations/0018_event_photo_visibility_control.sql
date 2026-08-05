-- =============================================================================
-- Zuvio — Migração 0018: visibilidade das fotos é decisão do organizador
-- =============================================================================
-- Antes, cada pessoa que postava uma foto escolhia a visibilidade
-- daquela foto especificamente (`event_photos.visibilidade`). Mudança
-- de regra de negócio: quem decide se as fotos do evento são vistas só
-- por quem participa ou por todo mundo é o ORGANIZADOR, e vale pra
-- TODAS as fotos do evento de uma vez — não é escolha individual de
-- quem posta.
--
-- Em vez de migrar/remover a coluna `event_photos.visibilidade` (dado
-- histórico, e RLS que já dependia dela), a política de SELECT passa a
-- checar a nova flag no evento (`events.fotos_publicas`), ignorando o
-- valor por-foto daqui pra frente. A coluna antiga fica no schema sem
-- uso — não vale a pena uma migração de dados só pra isso agora.
-- =============================================================================

alter table events add column fotos_publicas boolean not null default false;

drop policy "Ver fotos públicas, ou do evento se for participante/organizador" on event_photos;

create policy "Fotos: público se o organizador liberou, senão só quem participa"
  on event_photos for select
  to authenticated
  using (
    exists (
      select 1 from events e
      where e.id = event_id
        and (e.fotos_publicas or is_event_creator(event_id, auth.uid()) or is_event_participant(event_id, auth.uid()))
    )
  );
