-- =============================================================================
-- Zuvio — Migração 0025: corrige "não dá pra participar de novo depois
-- de cancelar"
-- =============================================================================
-- `commitments` tem `unique (event_id, user_id)` — cancelar não apaga a
-- linha, só marca `status = 'cancelado'` (preserva histórico pro score
-- de confiabilidade). `commit_to_event` fazia um INSERT simples, que
-- colide com essa constraint sempre que já existe uma linha cancelada
-- pro mesmo par evento/usuário — a checagem de "já confirmou presença"
-- olha só linhas não-canceladas, então passava por ali, mas o INSERT
-- em si estourava "duplicate key value violates unique constraint"
-- (erro de baixo nível do Postgres, não a mensagem amigável da função).
-- Reabrir a página não ajuda porque o problema é o dado no servidor,
-- não cache do cliente.
--
-- Correção: UPSERT (`on conflict ... do update`) em vez de INSERT puro
-- — reaproveita a linha cancelada, resetando os campos do ciclo
-- anterior de compromisso (checkin_em, pagamento_confirmado,
-- google_calendar_event_id) para o estado de uma confirmação nova.
-- Testado diretamente no banco: confirmar → cancelar → confirmar de
-- novo reaproveita a mesma linha sem erro.
-- =============================================================================

create or replace function commit_to_event(p_event_id uuid)
returns commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_commitment commitments%rowtype;
begin
  select * into v_event from events where id = p_event_id for update;

  if v_event.id is null then
    raise exception 'Evento não encontrado';
  end if;

  if v_event.status not in ('aberto', 'quorum_atingido') then
    raise exception 'Este evento não aceita mais confirmações';
  end if;

  if v_event.vagas_confirmadas >= v_event.vagas_total then
    raise exception 'Vagas esgotadas';
  end if;

  if v_event.modalidade = 'restrita' and not exists (
    select 1 from invites i where i.event_id = p_event_id and auth.uid() = any(i.usado_por)
  ) then
    raise exception 'Este evento é por convite';
  end if;

  if exists (
    select 1 from commitments
    where event_id = p_event_id and user_id = auth.uid() and status <> 'cancelado'
  ) then
    raise exception 'Você já confirmou presença neste evento';
  end if;

  insert into commitments (event_id, user_id, status)
  values (p_event_id, auth.uid(), 'confirmado')
  on conflict (event_id, user_id) do update
    set status = 'confirmado',
        confirmado_em = now(),
        checkin_em = null,
        pagamento_confirmado = false,
        google_calendar_event_id = null
  returning * into v_commitment;

  update events
  set vagas_confirmadas = vagas_confirmadas + 1,
      status = (case
        when vagas_confirmadas + 1 >= vagas_total then 'fechado'
        when vagas_confirmadas + 1 >= quorum_minimo then 'quorum_atingido'
        else 'aberto'
      end)::event_status
  where id = p_event_id;

  return v_commitment;
end;
$$;
