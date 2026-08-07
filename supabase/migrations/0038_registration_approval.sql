-- Zuvio — Migração 0038 (Aprovação de inscrições, parte 2/2)
--
-- Organizador pode marcar um evento como "exige aprovação de
-- inscrições": confirmar presença deixa de entrar direto como
-- 'confirmado' e passa a entrar como 'pendente', sem contar em
-- `vagas_confirmadas` nem em quórum, até o organizador aprovar ou
-- rejeitar. Reaproveita a mesma tabela `commitments` (não uma tabela
-- separada de "solicitações") — é o mesmo ciclo de vida de sempre,
-- só com um degrau novo no meio.
--
-- Efeitos em cascata cuidadosamente considerados:
--
--   1. `is_event_participant` (usada em ~13 policies de RLS — chat,
--      fotos, comentários, curtidas, avisos, lista colaborativa) hoje
--      trata qualquer status `<> 'cancelado'` como "participante".
--      Precisa excluir 'pendente' e 'rejeitado' também — do contrário,
--      quem ainda não foi aprovado ganharia acesso a chat/fotos/avisos
--      do evento, o que contradiz o próprio pedido ("só depois de
--      aprovado a pessoa pode entrar"). Uma função só, corrigida uma
--      vez, corrige as ~13 policies de uma vez (é exatamente o motivo
--      de ela existir, ver 0002/0003).
--
--   2. `commit_to_event`: precisa (a) considerar pedidos 'pendente' já
--      em aberto na checagem de vagas esgotadas — senão dá pra
--      "estourar" a capacidade do evento com pedidos pendentes que,
--      se todos aprovados, passariam do total; (b) inserir como
--      'pendente' em vez de 'confirmado' quando o evento exige
--      aprovação, sem mexer em `vagas_confirmadas` (isso só acontece
--      na aprovação); (c) deixar 'rejeitado' também reabrir a
--      possibilidade de tentar de novo (mesmo tratamento que
--      'cancelado' já tinha desde o 0025).
--
--   3. `cancel_commitment`: hoje SEMPRE decrementa `vagas_confirmadas`
--      ao cancelar, não importa o status anterior. Sem ajuste, cancelar
--      uma inscrição 'pendente' (que nunca somou em vagas_confirmadas)
--      decrementaria incorretamente a contagem de vagas de verdade.
--      Passa a decrementar só quando o status anterior era 'confirmado'
--      ou 'check-in'.

alter table events add column exige_aprovacao boolean not null default false;

-- 1) is_event_participant -----------------------------------------------
create or replace function is_event_participant(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from commitments
    where event_id = p_event_id
      and user_id = p_user_id
      and status not in ('cancelado', 'pendente', 'rejeitado')
  );
$$;

-- 2) commit_to_event -------------------------------------------------------
create or replace function commit_to_event(p_event_id uuid)
returns commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_commitment commitments%rowtype;
  v_pendentes integer;
  v_novo_status commitment_status;
begin
  select * into v_event from events where id = p_event_id for update;

  if v_event.id is null then
    raise exception 'Evento não encontrado';
  end if;

  if v_event.status not in ('aberto', 'quorum_atingido') then
    raise exception 'Este evento não aceita mais confirmações';
  end if;

  select count(*) into v_pendentes
  from commitments
  where event_id = p_event_id and status = 'pendente';

  -- Pedidos pendentes também "reservam" capacidade, senão dá pra
  -- aprovar mais gente do que cabe no evento.
  if v_event.vagas_confirmadas + v_pendentes >= v_event.vagas_total then
    raise exception 'Vagas esgotadas';
  end if;

  if v_event.modalidade = 'restrita' and not exists (
    select 1 from invites i where i.event_id = p_event_id and auth.uid() = any(i.usado_por)
  ) then
    raise exception 'Este evento é por convite';
  end if;

  if exists (
    select 1 from commitments
    where event_id = p_event_id and user_id = auth.uid()
      and status not in ('cancelado', 'rejeitado')
  ) then
    raise exception 'Você já confirmou presença neste evento';
  end if;

  v_novo_status := case when v_event.exige_aprovacao then 'pendente' else 'confirmado' end;

  insert into commitments (event_id, user_id, status)
  values (p_event_id, auth.uid(), v_novo_status)
  on conflict (event_id, user_id) do update
    set status = v_novo_status,
        confirmado_em = now(),
        checkin_em = null,
        pagamento_confirmado = false,
        google_calendar_event_id = null
  returning * into v_commitment;

  -- Pendente ainda não é uma vaga de verdade — só entra na contagem
  -- (e pode fechar vagas/liberar quórum) quando o organizador aprovar,
  -- em `approve_commitment`.
  if v_novo_status = 'confirmado' then
    update events
    set vagas_confirmadas = vagas_confirmadas + 1,
        status = (case
          when vagas_confirmadas + 1 >= vagas_total then 'fechado'
          when vagas_confirmadas + 1 >= quorum_minimo then 'quorum_atingido'
          else 'aberto'
        end)::event_status
    where id = p_event_id;
  end if;

  return v_commitment;
end;
$$;

-- 3) cancel_commitment -------------------------------------------------------
create or replace function cancel_commitment(p_event_id uuid)
returns void
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

  select * into v_commitment from commitments
  where event_id = p_event_id and user_id = auth.uid() and status <> 'cancelado'
  for update;

  if v_commitment.id is null then
    raise exception 'Você não tem um compromisso ativo neste evento';
  end if;

  update commitments set status = 'cancelado' where id = v_commitment.id;

  -- 'pendente' nunca somou em vagas_confirmadas — só decrementa (e
  -- recalcula o status do evento) se o compromisso cancelado já
  -- ocupava uma vaga de verdade.
  if v_commitment.status in ('confirmado', 'check-in') then
    update events
    set vagas_confirmadas = greatest(0, vagas_confirmadas - 1),
        status = (case
          when v_event.status in ('cancelado', 'concluido') then v_event.status
          when greatest(0, vagas_confirmadas - 1) >= vagas_total then 'fechado'
          when greatest(0, vagas_confirmadas - 1) >= quorum_minimo then 'quorum_atingido'
          else 'aberto'
        end)::event_status
    where id = p_event_id;
  end if;
end;
$$;

-- 4) approve_commitment -------------------------------------------------------
-- Organizador aprova uma inscrição pendente: vira 'confirmado' e SÓ
-- AGORA soma em vagas_confirmadas/recalcula o status do evento (mesmo
-- bloco de sempre, movido pra cá em vez de rodar no momento do
-- pedido).
create or replace function approve_commitment(p_commitment_id uuid)
returns commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commitment commitments%rowtype;
  v_event events%rowtype;
begin
  select c.* into v_commitment
  from commitments c
  join events e on e.id = c.event_id
  where c.id = p_commitment_id and e.criador_id = auth.uid()
  for update of c;

  if v_commitment.id is null then
    raise exception 'Inscrição não encontrada';
  end if;

  if v_commitment.status <> 'pendente' then
    raise exception 'Esta inscrição já foi resolvida';
  end if;

  select * into v_event from events where id = v_commitment.event_id for update;

  if v_event.vagas_confirmadas >= v_event.vagas_total then
    raise exception 'Vagas esgotadas — não é possível aprovar mais inscrições';
  end if;

  update commitments set status = 'confirmado' where id = p_commitment_id
  returning * into v_commitment;

  update events
  set vagas_confirmadas = vagas_confirmadas + 1,
      status = (case
        when vagas_confirmadas + 1 >= vagas_total then 'fechado'
        when vagas_confirmadas + 1 >= quorum_minimo then 'quorum_atingido'
        else 'aberto'
      end)::event_status
  where id = v_event.id;

  return v_commitment;
end;
$$;

-- 5) reject_commitment -------------------------------------------------------
-- Vira 'rejeitado' (não 'cancelado' — ver nota da migração 0037 sobre
-- por que isso importa pra reputação). Nunca somou em
-- vagas_confirmadas, então não há nada pra decrementar.
create or replace function reject_commitment(p_commitment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update commitments c
  set status = 'rejeitado'
  from events e
  where c.id = p_commitment_id
    and c.event_id = e.id
    and e.criador_id = auth.uid()
    and c.status = 'pendente';

  if not found then
    raise exception 'Inscrição não encontrada ou já resolvida';
  end if;
end;
$$;

-- 6) list_pending_registrations -----------------------------------------------
-- ÚNICA função do app que expõe e-mail (`auth.users.email`) — o
-- organizador precisa poder identificar/contatar quem pediu inscrição
-- pra decidir se aprova. Acesso estritamente restrito a
-- `criador_id = auth.uid()`: ninguém vê e-mail de inscrição em evento
-- que não organiza, e isto nunca é exposto via view/policy — só por
-- esta função, sob essa checagem.
create or replace function list_pending_registrations(p_event_id uuid)
returns table (
  commitment_id uuid,
  user_id uuid,
  nome text,
  foto_url text,
  email text,
  criado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from events where id = p_event_id and criador_id = auth.uid()) then
    raise exception 'Evento não encontrado';
  end if;

  return query
  select c.id, c.user_id, p.nome, p.foto_url, u.email, c.confirmado_em
  from commitments c
  join profiles p on p.id = c.user_id
  join auth.users u on u.id = c.user_id
  where c.event_id = p_event_id and c.status = 'pendente'
  order by c.confirmado_em asc;
end;
$$;

grant execute on function approve_commitment(uuid) to authenticated;
revoke execute on function approve_commitment(uuid) from public, anon;

grant execute on function reject_commitment(uuid) to authenticated;
revoke execute on function reject_commitment(uuid) from public, anon;

grant execute on function list_pending_registrations(uuid) to authenticated;
revoke execute on function list_pending_registrations(uuid) from public, anon;
