-- =============================================================================
-- Zuvio — Migração 0012: organizador também tem acesso ao chat liberado
-- =============================================================================
-- O organizador de um evento nunca passa pelo fluxo de "comprometer-se"
-- no próprio evento (não existe esse botão nele mesmo) — por isso
-- nunca tem uma linha em `commitments`. As políticas de RLS do chat
-- exigiam justamente essa linha para liberar leitura/escrita, então o
-- chat ficava invisível (e bloqueado) para quem criou o evento, mesmo
-- depois do quórum atingido.
--
-- Correção: usa `is_event_creator` (já existente, security definer)
-- como uma condição alternativa, ao lado da checagem de compromisso.
-- =============================================================================

drop policy if exists "Só participantes confirmados leem o chat liberado" on chat_messages;
drop policy if exists "Só participantes confirmados escrevem no chat liberado" on chat_messages;

create policy "Participantes confirmados ou o organizador leem o chat liberado"
  on chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from events e
      where e.id = event_id
        and e.status in ('quorum_atingido', 'fechado', 'concluido')
    )
    and (
      is_event_creator(event_id, auth.uid())
      or exists (
        select 1 from commitments c
        where c.event_id = chat_messages.event_id
          and c.user_id = auth.uid()
          and c.status in ('confirmado', 'check-in')
      )
    )
  );

create policy "Participantes confirmados ou o organizador escrevem no chat liberado"
  on chat_messages for insert
  to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from events e
      where e.id = event_id
        and e.status in ('quorum_atingido', 'fechado', 'concluido')
    )
    and (
      is_event_creator(event_id, auth.uid())
      or exists (
        select 1 from commitments c
        where c.event_id = chat_messages.event_id
          and c.user_id = auth.uid()
          and c.status in ('confirmado', 'check-in')
      )
    )
  );
