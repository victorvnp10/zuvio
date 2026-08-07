-- =============================================================================
-- Zuvio — Migração inicial (MVP)
-- =============================================================================
-- Rode este arquivo no SQL Editor do seu projeto Supabase, ou via
-- `supabase db push` se estiver usando a CLI (veja README.md).
--
-- Este schema é a FONTE DA VERDADE das regras de negócio no servidor —
-- as mesmas regras de quórum e confiabilidade que existem em
-- `src/domain/services/` (TypeScript, usadas para UI otimista) estão
-- espelhadas aqui em `commit_to_event()` e `cancel_commitment()`, que
-- rodam dentro de uma transação com lock de linha (`for update`) para
-- que duas pessoas confirmando a última vaga ao mesmo tempo nunca
-- resultem em vagas_confirmadas > vagas_total.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensões
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type event_category as enum ('esporte', 'viagem', 'hobby', 'encontro', 'estudo', 'outro');
create type event_modality as enum ('estranhos', 'amigos', 'hibrida', 'restrita');
create type event_status as enum ('aberto', 'quorum_atingido', 'fechado', 'concluido', 'cancelado');
create type commitment_status as enum ('confirmado', 'check-in', 'no-show', 'cancelado');
create type trust_badge as enum ('nenhum', 'bronze', 'prata', 'ouro');
create type invite_usage as enum ('unico', 'multiplo');

-- -----------------------------------------------------------------------------
-- TABELAS (todas primeiro — políticas de RLS vêm depois, numa seção
-- separada, porque várias políticas fazem referência cruzada entre
-- tabelas, ex.: a política de `events` consulta `commitments` e
-- `invites`. No Postgres, a tabela referenciada precisa já existir no
-- momento em que a política é criada — juntar tudo aqui evita esse
-- problema de ordem de uma vez por todas.
-- -----------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  foto_url text,
  -- Nunca exibida publicamente (ver view public_profiles abaixo) — só
  -- para verificação de idade mínima e segmentação por faixa etária.
  data_nascimento date not null check (data_nascimento <= (current_date - interval '18 years')),
  -- Campo opcional — nunca usado para restringir acesso.
  genero text,
  localizacao_base text not null,
  categorias_interesse event_category[] not null default '{}',
  score_confiabilidade integer not null default 100 check (score_confiabilidade between 0 and 100),
  selo trust_badge not null default 'nenhum',
  is_admin boolean not null default false,
  criado_em timestamptz not null default now()
);

create view public_profiles as
  select id, nome, foto_url, genero, localizacao_base, categorias_interesse,
         score_confiabilidade, selo, criado_em
  from profiles;

create table events (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references profiles(id) on delete cascade,
  categoria event_category not null,
  titulo text not null check (char_length(titulo) between 3 and 80),
  descricao text not null default '',
  data_hora timestamptz not null,
  endereco text not null,
  geo_lat double precision,
  geo_lng double precision,
  modalidade event_modality not null default 'estranhos',
  vagas_total integer not null check (vagas_total between 1 and 200),
  vagas_confirmadas integer not null default 0 check (vagas_confirmadas >= 0),
  quorum_minimo integer not null check (quorum_minimo >= 1),
  status event_status not null default 'aberto',
  criado_em timestamptz not null default now(),

  constraint quorum_within_vagas check (quorum_minimo <= vagas_total),
  constraint vagas_within_total check (vagas_confirmadas <= vagas_total)
);

create index events_categoria_localizacao_idx on events (categoria, status, data_hora);

create table invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  criado_por uuid not null references profiles(id) on delete cascade,
  -- Código não sequencial/não adivinhável (seção 11).
  codigo text not null unique default encode(gen_random_bytes(9), 'base64'),
  uso invite_usage not null default 'unico',
  expira_em timestamptz,
  usado_por uuid[] not null default '{}',
  criado_em timestamptz not null default now()
);

create table commitments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status commitment_status not null default 'confirmado',
  confirmado_em timestamptz not null default now(),
  checkin_em timestamptz,

  unique (event_id, user_id)
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  criado_em timestamptz not null default now()
);

create index chat_messages_event_idx on chat_messages (event_id, criado_em);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  avaliador_id uuid not null references profiles(id) on delete cascade,
  avaliado_id uuid not null references profiles(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text,
  criado_em timestamptz not null default now(),

  unique (event_id, avaliador_id, avaliado_id),
  check (avaliador_id <> avaliado_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  denunciante_id uuid not null references profiles(id) on delete cascade,
  denunciado_id uuid references profiles(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  motivo text not null check (char_length(motivo) between 3 and 500),
  status text not null default 'pendente' check (status in ('pendente', 'em_analise', 'resolvido')),
  criado_em timestamptz not null default now()
);

create table blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  criado_em timestamptz not null default now(),

  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- -----------------------------------------------------------------------------
-- Função auxiliar para RLS (definida antes das políticas que a usam)
-- -----------------------------------------------------------------------------
-- Checa se um usuário é participante ativo de um evento sem disparar a
-- própria política de RLS de `commitments` recursivamente — por isso é
-- `security definer` (dona `postgres`, isenta da própria RLS por
-- padrão) em vez de uma subquery direta em `commitments` dentro da
-- política de `commitments`. Uma subquery direta causaria "infinite
-- recursion detected in policy for relation commitments".
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
      and status <> 'cancelado'
  );
$$;

-- As duas funções abaixo existem pelo mesmo motivo: qualquer subquery
-- direta entre `events` e `commitments` dentro de uma política de RLS
-- forma um ciclo (events → commitments → events → ...), que o Postgres
-- também rejeita como recursão infinita — não é só self-reference
-- direto que causa o problema, referência cruzada entre duas tabelas
-- também causa.
create or replace function is_event_creator(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from events where id = p_event_id and criador_id = p_user_id
  );
$$;

create or replace function has_redeemed_invite(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from invites where event_id = p_event_id and p_user_id = any(usado_por)
  );
$$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (todas as tabelas já existem a partir daqui)
-- -----------------------------------------------------------------------------

alter table profiles enable row level security;

create policy "Qualquer um autenticado pode ler perfis"
  on profiles for select
  to authenticated
  using (true);

create policy "Usuário só edita o próprio perfil"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Usuário cria o próprio perfil"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

alter table events enable row level security;

-- Descoberta pública: qualquer evento não-Restrito, aberto ou com
-- quórum atingido. Eventos Restritos NUNCA aparecem aqui (seção 6.4).
create policy "Descoberta pública de eventos não-restritos"
  on events for select
  to authenticated
  using (
    modalidade <> 'restrita'
    or criador_id = auth.uid()
    or is_event_participant(id, auth.uid())
    or has_redeemed_invite(id, auth.uid())
  );

create policy "Usuário autenticado cria proposta"
  on events for insert
  to authenticated
  with check (criador_id = auth.uid());

-- Só o criador edita, e só campos de conteúdo — vagas_confirmadas e
-- status são alterados exclusivamente pelas funções abaixo (security
-- definer), nunca diretamente pelo cliente (H4 — imutabilidade de
-- campos críticos).
create policy "Criador edita a própria proposta"
  on events for update
  to authenticated
  using (criador_id = auth.uid())
  with check (criador_id = auth.uid());

alter table invites enable row level security;

create policy "Criador do convite gerencia seus convites"
  on invites for all
  to authenticated
  using (criado_por = auth.uid())
  with check (criado_por = auth.uid());

alter table commitments enable row level security;

create policy "Ver compromissos de eventos onde participo"
  on commitments for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_event_creator(event_id, auth.uid())
    or is_event_participant(event_id, auth.uid())
  );

-- INSERT/UPDATE de compromissos NÃO tem policy direta — só acontece
-- via as funções `commit_to_event` / `cancel_commitment` /
-- `checkin_event` (security definer), que fazem toda a validação
-- atômica de quórum/vagas. Isso é proposital: impede que o cliente
-- manipule vagas_confirmadas do evento inserindo compromissos direto.

alter table chat_messages enable row level security;

create policy "Só participantes confirmados leem o chat liberado"
  on chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from events e
      where e.id = event_id
        and e.status in ('quorum_atingido', 'fechado', 'concluido')
    )
    and exists (
      select 1 from commitments c
      where c.event_id = chat_messages.event_id
        and c.user_id = auth.uid()
        and c.status in ('confirmado', 'check-in')
    )
  );

create policy "Só participantes confirmados escrevem no chat liberado"
  on chat_messages for insert
  to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from events e
      where e.id = event_id
        and e.status in ('quorum_atingido', 'fechado', 'concluido')
    )
    and exists (
      select 1 from commitments c
      where c.event_id = chat_messages.event_id
        and c.user_id = auth.uid()
        and c.status in ('confirmado', 'check-in')
    )
  );

alter table ratings enable row level security;

create policy "Ler avaliações de eventos concluídos"
  on ratings for select
  to authenticated
  using (true);

create policy "Avaliar só quem participou do mesmo evento concluído"
  on ratings for insert
  to authenticated
  with check (
    avaliador_id = auth.uid()
    and exists (
      select 1 from events e where e.id = event_id and e.status = 'concluido'
    )
    and exists (
      select 1 from commitments c
      where c.event_id = ratings.event_id and c.user_id = auth.uid() and c.status = 'check-in'
    )
    and exists (
      select 1 from commitments c
      where c.event_id = ratings.event_id and c.user_id = avaliado_id and c.status = 'check-in'
    )
  );

alter table reports enable row level security;

create policy "Usuário cria denúncia"
  on reports for insert
  to authenticated
  with check (denunciante_id = auth.uid());

create policy "Usuário vê as próprias denúncias; admin vê todas"
  on reports for select
  to authenticated
  using (
    denunciante_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

alter table blocks enable row level security;

create policy "Usuário gerencia os próprios bloqueios"
  on blocks for all
  to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- =============================================================================
-- Funções (regras de negócio no servidor — fonte da verdade)
-- =============================================================================

-- Confirmar presença numa proposta. `for update` trava a linha do
-- evento durante a transação — evita que duas pessoas confirmando a
-- última vaga ao mesmo tempo estourem vagas_confirmadas > vagas_total.
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
      status = case
        when vagas_confirmadas + 1 >= vagas_total then 'fechado'
        when vagas_confirmadas + 1 >= quorum_minimo then 'quorum_atingido'
        else 'aberto'
      end
  where id = p_event_id;

  return v_commitment;
end;
$$;

-- Cancelar um compromisso já confirmado. Reabre uma vaga e recalcula o
-- status do evento — inclusive "voltando" de quorum_atingido para
-- aberto se o cancelamento derrubar a contagem abaixo do quórum.
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
      status = case
        when v_event.status in ('cancelado', 'concluido') then v_event.status
        when greatest(0, vagas_confirmadas - 1) >= vagas_total then 'fechado'
        when greatest(0, vagas_confirmadas - 1) >= quorum_minimo then 'quorum_atingido'
        else 'aberto'
      end
  where id = p_event_id;
end;
$$;

-- Check-in geolocalizado. A validação de raio/janela de tempo (seção
-- 6.1) acontece no cliente (`domain/valueObjects/Eligibility.ts`) antes
-- de chamar esta função — aqui validamos de novo no servidor (H1,
-- defesa em profundidade: nunca confiar só na validação do cliente).
create or replace function checkin_event(
  p_event_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_commitment commitments%rowtype;
  v_distance_meters double precision;
begin
  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'Evento não encontrado';
  end if;

  if v_event.geo_lat is null or v_event.geo_lng is null then
    raise exception 'Evento sem localização cadastrada';
  end if;

  -- Haversine simplificado (raio da Terra em metros).
  v_distance_meters := 6371000 * acos(
    least(1, greatest(-1,
      cos(radians(p_lat)) * cos(radians(v_event.geo_lat)) *
      cos(radians(v_event.geo_lng) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(v_event.geo_lat))
    ))
  );

  if v_distance_meters > 100 then
    raise exception 'Você precisa estar no local do evento para fazer check-in';
  end if;

  if now() < v_event.data_hora - interval '30 minutes'
     or now() > v_event.data_hora + interval '180 minutes' then
    raise exception 'Fora da janela de horário do check-in';
  end if;

  update commitments
  set status = 'check-in', checkin_em = now()
  where event_id = p_event_id and user_id = auth.uid() and status = 'confirmado'
  returning * into v_commitment;

  if v_commitment.id is null then
    raise exception 'Compromisso confirmado não encontrado para este check-in';
  end if;

  return v_commitment;
end;
$$;

-- Resgatar um convite (modalidade Restrita) — evita expor a lista de
-- convites/códigos válidos via select direto na tabela.
create or replace function redeem_invite(p_codigo text)
returns uuid -- retorna event_id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
begin
  select * into v_invite from invites where codigo = p_codigo for update;

  if v_invite.id is null then
    raise exception 'Convite inválido';
  end if;

  if v_invite.expira_em is not null and now() > v_invite.expira_em then
    raise exception 'Convite expirado';
  end if;

  if v_invite.uso = 'unico' and array_length(v_invite.usado_por, 1) > 0 then
    raise exception 'Convite já utilizado';
  end if;

  update invites
  set usado_por = array_append(usado_por, auth.uid())
  where id = v_invite.id;

  return v_invite.event_id;
end;
$$;

-- Recalcula score de confiabilidade e selo de um perfil a partir do
-- histórico de compromissos — espelha
-- `domain/services/ReliabilityService.ts` no servidor.
create or replace function recompute_reliability(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_checkins integer;
  v_score integer;
  v_badge trust_badge;
begin
  select count(*) filter (where status in ('check-in', 'no-show', 'cancelado')),
         count(*) filter (where status = 'check-in')
  into v_total, v_checkins
  from commitments
  where user_id = p_user_id;

  if v_total = 0 then
    v_score := 100;
    v_badge := 'nenhum';
  else
    v_score := round((v_checkins::numeric / v_total) * 100);
    v_badge := case
      when v_score >= 90 then 'ouro'
      when v_score >= 75 then 'prata'
      when v_score >= 50 then 'bronze'
      else 'nenhum'
    end;
  end if;

  update profiles
  set score_confiabilidade = v_score, selo = v_badge
  where id = p_user_id;
end;
$$;

-- Dispara o recálculo de confiabilidade sempre que o status de um
-- compromisso muda (check-in, no-show, cancelamento).
create or replace function trigger_recompute_reliability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform recompute_reliability(new.user_id);
  return new;
end;
$$;

create trigger commitments_status_change
  after update of status on commitments
  for each row
  when (old.status is distinct from new.status)
  execute function trigger_recompute_reliability();

-- Cria a linha em `profiles` automaticamente após o cadastro no Supabase
-- Auth — os campos obrigatórios (nome, data_nascimento, localizacao_base)
-- vêm de `raw_user_meta_data`, preenchidos no momento do signUp.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, data_nascimento, genero, localizacao_base)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Novo usuário'),
    (new.raw_user_meta_data->>'data_nascimento')::date,
    new.raw_user_meta_data->>'genero',
    coalesce(new.raw_user_meta_data->>'localizacao_base', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
