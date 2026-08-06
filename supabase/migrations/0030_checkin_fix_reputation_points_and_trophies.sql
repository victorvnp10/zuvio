-- Zuvio — Migração 0030
--
-- Contexto: o botão "Fazer check-in" ficava mudo sempre que o evento
-- não tinha coordenadas salvas (a captura de geo é opcional na
-- criação do evento — muitos eventos reais não têm). O guard no
-- cliente (`useEventDetail.handleCheckin`) saía sem erro nenhum
-- quando `event.local.geo` era null, então o clique parecia não fazer
-- nada. Esta migração:
--
--   1. Deixa `checkin_event` aceitar check-in sem geo (valida só a
--      janela de horário) — mantém a validação de raio de 100m quando
--      o evento TEM coordenadas.
--   2. Fecha o ciclo do "no-show": hoje nada nunca marcava um
--      compromisso 'confirmado' como 'no-show' depois do evento
--      passar — ou seja, a reputação só podia subir ou ficar igual,
--      nunca cair por "confirmou e não apareceu". `conclude_past_events()`
--      varre eventos vencidos, marca 'concluido' e vira 'no-show' quem
--      não fez check-in. Chamada de forma oportunista pelo cliente
--      (best-effort, sem depender de pg_cron).
--   3. Pontos de reputação: +10 por check-in, -15 por no-show, -5 por
--      cancelamento, piso em zero — dá um número visível de "quanto
--      subiu/desceu" além do selo/percentual que já existia.
--   4. Troféus: catálogo simples (`trophies`) + conquistas por perfil
--      (`profile_trophies`), recalculados junto com a reputação a
--      cada mudança de status de compromisso.

-- 1) Reputação: pontos ---------------------------------------------------
alter table profiles add column pontos_reputacao integer not null default 0
  check (pontos_reputacao >= 0);

-- 2) Catálogo de troféus --------------------------------------------------
create table trophies (
  id text primary key,
  nome text not null,
  descricao text not null,
  emoji text not null,
  criterio_tipo text not null check (criterio_tipo in ('checkins', 'pontos', 'selo_ouro')),
  criterio_valor integer,
  ordem integer not null default 0
);

insert into trophies (id, nome, descricao, emoji, criterio_tipo, criterio_valor, ordem) values
  ('checkin_1', 'Estreante', 'Fez o primeiro check-in em um evento', '🎟️', 'checkins', 1, 1),
  ('checkin_5', 'Frequentador', 'Check-in confirmado em 5 eventos', '🥉', 'checkins', 5, 2),
  ('checkin_15', 'Assíduo', 'Check-in confirmado em 15 eventos', '🥈', 'checkins', 15, 3),
  ('checkin_30', 'Lenda do Zuvio', 'Check-in confirmado em 30 eventos', '🥇', 'checkins', 30, 4),
  ('pontos_100', 'Confiável', 'Alcançou 100 pontos de reputação', '🛡️', 'pontos', 100, 5),
  ('selo_ouro', 'Selo de Ouro', 'Atingiu o selo de confiabilidade Ouro', '🏆', 'selo_ouro', null, 6);

alter table trophies enable row level security;

-- Catálogo é público (mesmo padrão de `categories`) — todo mundo
-- precisa ver quais troféus existem pra saber o que ainda falta.
create policy "trophies_select_authenticated" on trophies
  for select to authenticated using (true);

create table profile_trophies (
  profile_id uuid not null references profiles(id) on delete cascade,
  trophy_id text not null references trophies(id) on delete cascade,
  conquistado_em timestamptz not null default now(),
  primary key (profile_id, trophy_id)
);

create index profile_trophies_profile_id_idx on profile_trophies(profile_id);
create index profile_trophies_trophy_id_idx on profile_trophies(trophy_id);

alter table profile_trophies enable row level security;

-- Só o dono (e o admin) vê as próprias conquistas por enquanto — sem
-- exibição pública ainda, mesma cautela do restante do app com dados
-- de perfil.
create policy "profile_trophies_select_own_or_admin" on profile_trophies
  for select to authenticated
  using (profile_id = (select auth.uid()) or is_admin((select auth.uid())));

-- 3) Recalcular troféus ----------------------------------------------------
create or replace function recompute_trophies(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkins integer;
  v_pontos integer;
  v_selo trust_badge;
begin
  select count(*) into v_checkins from commitments where user_id = p_user_id and status = 'check-in';
  select pontos_reputacao, selo into v_pontos, v_selo from profiles where id = p_user_id;

  insert into profile_trophies (profile_id, trophy_id)
  select p_user_id, t.id
  from trophies t
  where
    (t.criterio_tipo = 'checkins' and v_checkins >= t.criterio_valor)
    or (t.criterio_tipo = 'pontos' and v_pontos >= t.criterio_valor)
    or (t.criterio_tipo = 'selo_ouro' and v_selo = 'ouro')
  on conflict (profile_id, trophy_id) do nothing;
end;
$$;

-- Só chamada internamente (por `recompute_reliability`, via trigger) —
-- mesmo tratamento de `recompute_reliability` em si.
revoke all on function recompute_trophies(uuid) from public, anon, authenticated;

-- 4) `recompute_reliability` passa a calcular pontos e troféus também ----
create or replace function recompute_reliability(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_checkins integer;
  v_no_shows integer;
  v_cancelados integer;
  v_score integer;
  v_badge trust_badge;
  v_pontos integer;
begin
  select count(*) filter (where status in ('check-in', 'no-show', 'cancelado')),
         count(*) filter (where status = 'check-in'),
         count(*) filter (where status = 'no-show'),
         count(*) filter (where status = 'cancelado')
  into v_total, v_checkins, v_no_shows, v_cancelados
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

  v_pontos := greatest(0, v_checkins * 10 - v_no_shows * 15 - v_cancelados * 5);

  update profiles
  set score_confiabilidade = v_score, selo = v_badge, pontos_reputacao = v_pontos
  where id = p_user_id;

  perform recompute_trophies(p_user_id);
end;
$$;

-- 5) Check-in: aceita evento sem geo, devolve pontos ganhos e troféus
--    novos pro cliente comemorar. Muda o tipo de retorno (commitments
--    -> jsonb), então precisa dropar antes de recriar.
drop function if exists checkin_event(uuid, double precision, double precision);

create function checkin_event(
  p_event_id uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_commitment commitments%rowtype;
  v_distance_meters double precision;
  v_trofeus_antes text[];
  v_pontos_antes integer;
  v_pontos_depois integer;
  v_trofeus_novos jsonb;
begin
  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'Evento não encontrado';
  end if;

  -- Só valida raio quando o evento tem coordenadas salvas — sem isso,
  -- o check-in vira "auto-declarado", limitado só pela janela de
  -- horário (mesma janela de sempre: 30min antes a 180min depois).
  if v_event.geo_lat is not null and v_event.geo_lng is not null then
    if p_lat is null or p_lng is null then
      raise exception 'Localização necessária para o check-in deste evento';
    end if;

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
  end if;

  if now() < v_event.data_hora - interval '30 minutes'
     or now() > v_event.data_hora + interval '180 minutes' then
    raise exception 'Fora da janela de horário do check-in';
  end if;

  select coalesce(array_agg(trophy_id), array[]::text[]) into v_trofeus_antes
  from profile_trophies where profile_id = auth.uid();
  select pontos_reputacao into v_pontos_antes from profiles where id = auth.uid();

  update commitments
  set status = 'check-in', checkin_em = now()
  where event_id = p_event_id and user_id = auth.uid() and status = 'confirmado'
  returning * into v_commitment;

  if v_commitment.id is null then
    raise exception 'Compromisso confirmado não encontrado para este check-in';
  end if;

  -- O UPDATE acima disparou o trigger `commitments_status_change`, que
  -- já recalculou pontos/selo/troféus síncronamente — os SELECTs
  -- abaixo já leem os valores pós-recálculo.
  select pontos_reputacao into v_pontos_depois from profiles where id = auth.uid();

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'nome', t.nome, 'emoji', t.emoji, 'descricao', t.descricao
         )), '[]'::jsonb)
  into v_trofeus_novos
  from profile_trophies pt
  join trophies t on t.id = pt.trophy_id
  where pt.profile_id = auth.uid() and pt.trophy_id != all(v_trofeus_antes);

  return jsonb_build_object(
    'commitment', to_jsonb(v_commitment),
    'pontos_ganhos', coalesce(v_pontos_depois, 0) - coalesce(v_pontos_antes, 0),
    'pontos_totais', v_pontos_depois,
    'trofeus_novos', v_trofeus_novos
  );
end;
$$;

grant execute on function checkin_event(uuid, double precision, double precision) to authenticated;
revoke execute on function checkin_event(uuid, double precision, double precision) from public, anon;

-- 6) Varredura de eventos vencidos: marca 'concluido' e vira 'no-show'
--    quem confirmou mas nunca fez check-in. Chamada best-effort pelo
--    cliente (uma vez por sessão) — não depende de pg_cron.
create or replace function conclude_past_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update commitments c
  set status = 'no-show'
  from events e
  where c.event_id = e.id
    and c.status = 'confirmado'
    and e.status not in ('cancelado', 'concluido')
    and e.data_hora + interval '180 minutes' < now();

  update events
  set status = 'concluido'
  where status not in ('cancelado', 'concluido')
    and data_hora + interval '180 minutes' < now();
end;
$$;

grant execute on function conclude_past_events() to authenticated;
revoke execute on function conclude_past_events() from public, anon;

-- 7) Expor pontos de reputação no perfil público (mesmo nível de
--    visibilidade do selo/percentual, que já são públicos).
drop view public_profiles;

create view public_profiles
  with (security_invoker = true)
  as
  select id, nome, foto_url, genero, localizacao_base, categorias_interesse,
         score_confiabilidade, selo, pontos_reputacao, criado_em
  from profiles;

grant select on public_profiles to authenticated;
