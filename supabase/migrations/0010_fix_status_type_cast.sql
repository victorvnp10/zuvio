-- =============================================================================
-- Zuvio — Migração 0010: corrige erro de tipo em commit_to_event/cancel_commitment
-- =============================================================================
-- Erro: "column status is of type event_status but expression is of
-- type text".
--
-- Dentro de um CASE com literais de texto simples ('aberto', 'fechado',
-- etc.), o Postgres resolve o tipo do CASE inteiro como `text` — ele
-- NÃO usa o tipo da coluna de destino (`status event_status`) como
-- contexto para decidir o tipo dos literais dentro do CASE, mesmo
-- estando dentro de um UPDATE ... SET status = (esse CASE). Isso é
-- diferente de uma atribuição direta (`status = 'aberto'`), que
-- funciona porque aí sim a coluna dá o contexto de tipo direto para o
-- literal. Resultado: `commit_to_event` (e `cancel_commitment`, que
-- tem o mesmo padrão) nunca funcionaram para ninguém — o erro
-- acontecia para qualquer usuário tentando confirmar presença.
--
-- Correção: cast explícito `::event_status` em cada resultado do CASE.
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

create or replace function cancel_commitment(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
begin
  select * into v_event from events where id = p_event_id for update;

  if v_event.id is null then
    raise exception 'Evento não encontrado';
  end if;

  update commitments
  set status = 'cancelado'
  where event_id = p_event_id and user_id = auth.uid() and status <> 'cancelado';

  if not found then
    raise exception 'Você não tem um compromisso ativo neste evento';
  end if;

  update events
  set vagas_confirmadas = greatest(0, vagas_confirmadas - 1),
      status = (case
        when v_event.status in ('cancelado', 'concluido') then v_event.status
        when greatest(0, vagas_confirmadas - 1) >= vagas_total then 'fechado'
        when greatest(0, vagas_confirmadas - 1) >= quorum_minimo then 'quorum_atingido'
        else 'aberto'
      end)::event_status
  where id = p_event_id;
end;
$$;
