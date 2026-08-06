-- Zuvio — Migração 0034 (Fase 2 do módulo de Conferência: check-in por atividade)
--
-- Cada atividade tem seu próprio check-in, independente do check-in do
-- evento (que nem existe pra conferência — o modelo de commitment
-- continua sendo "confirmei presença na conferência inteira"). Pré-
-- requisito: já estar confirmado (ou com check-in) no evento-pai —
-- não dá pra fazer check-in numa atividade de uma conferência que a
-- pessoa nem confirmou presença.
--
-- Decisão de escopo: check-in de atividade NÃO alimenta
-- `pontos_reputacao`/`score_confiabilidade` (isso é sobre comparecer
-- ao EVENTO como um todo, já resolvido pela Fase de reputação/check-in
-- do evento). Aqui é um registro de presença mais granular, usado nas
-- próximas fases (contagem de acesso por atividade, gate de avaliação,
-- elegibilidade de certificado).

create table activity_checkins (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references conference_activities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  checkin_em timestamptz not null default now(),
  unique (activity_id, user_id)
);

create index activity_checkins_user_id_idx on activity_checkins(user_id);

alter table activity_checkins enable row level security;

-- Vê o próprio check-in, ou (organizador do evento) todos os
-- check-ins das atividades da própria conferência — necessário pra
-- fase de painel/contagem de acesso.
create policy "activity_checkins_select" on activity_checkins
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from conference_activities ca
      join events e on e.id = ca.event_id
      where ca.id = activity_checkins.activity_id and e.criador_id = (select auth.uid())
    )
  );

-- Só a função abaixo escreve (nenhuma policy de insert/update/delete
-- pra role nenhuma) — mesmo padrão de `commitments`.

create or replace function checkin_activity(
  p_activity_id uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns activity_checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity conference_activities%rowtype;
  v_distance_meters double precision;
  v_checkin activity_checkins%rowtype;
begin
  select * into v_activity from conference_activities where id = p_activity_id;
  if v_activity.id is null then
    raise exception 'Atividade não encontrada';
  end if;

  if not exists (
    select 1 from commitments
    where event_id = v_activity.event_id
      and user_id = auth.uid()
      and status in ('confirmado', 'check-in')
  ) then
    raise exception 'Confirme presença na conferência antes de fazer check-in numa atividade';
  end if;

  if v_activity.geo_lat is not null and v_activity.geo_lng is not null then
    if p_lat is null or p_lng is null then
      raise exception 'Localização necessária para o check-in desta atividade';
    end if;

    v_distance_meters := 6371000 * acos(
      least(1, greatest(-1,
        cos(radians(p_lat)) * cos(radians(v_activity.geo_lat)) *
        cos(radians(v_activity.geo_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(v_activity.geo_lat))
      ))
    );

    if v_distance_meters > 100 then
      raise exception 'Você precisa estar no local da atividade para fazer check-in';
    end if;
  end if;

  -- Janela mais curta que a do evento (que é de horas) — atividade tem
  -- início/fim próprios, então o check-in fica atrelado a eles: 15min
  -- antes de começar até 30min depois de terminar.
  if now() < v_activity.data_hora_inicio - interval '15 minutes'
     or now() > v_activity.data_hora_fim + interval '30 minutes' then
    raise exception 'Fora da janela de horário do check-in desta atividade';
  end if;

  insert into activity_checkins (activity_id, user_id)
  values (p_activity_id, auth.uid())
  on conflict (activity_id, user_id) do nothing
  returning * into v_checkin;

  -- Clique duplicado não é erro — devolve o check-in já existente.
  if v_checkin.id is null then
    select * into v_checkin from activity_checkins
    where activity_id = p_activity_id and user_id = auth.uid();
  end if;

  return v_checkin;
end;
$$;

grant execute on function checkin_activity(uuid, double precision, double precision) to authenticated;
revoke execute on function checkin_activity(uuid, double precision, double precision) from public, anon;
