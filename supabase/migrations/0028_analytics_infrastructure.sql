-- =============================================================================
-- Zuvio — Migração 0028: infraestrutura de analytics para o painel
-- admin (estatística de acesso, tempo em app, engajamento).
-- =============================================================================
-- Não existe backend customizado (ver ARCHITECTURE.md) — o rastreio
-- roda no cliente e grava eventos aqui. Sem "beacon" nativo confiável
-- de fechamento de aba em todo navegador, a estratégia honesta é
-- heartbeat: o cliente grava um evento a cada ~60s enquanto a aba está
-- visível, e o "tempo em app" de uma sessão é estimado pelo intervalo
-- entre o primeiro e o último evento dela — aproximação real, não
-- inventada.
-- =============================================================================

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  session_id uuid not null,
  tipo text not null check (tipo in ('session_start', 'page_view', 'heartbeat')),
  path text,
  criado_em timestamptz not null default now()
);

create index analytics_events_user_idx on analytics_events (user_id, criado_em);
create index analytics_events_session_idx on analytics_events (session_id, criado_em);
create index analytics_events_criado_em_idx on analytics_events (criado_em);
create index analytics_events_tipo_idx on analytics_events (tipo, criado_em);

alter table analytics_events enable row level security;

create policy "Usuário registra os próprios eventos"
  on analytics_events for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Só admin lê eventos de analytics"
  on analytics_events for select
  to authenticated
  using (is_admin((select auth.uid())));

-- -----------------------------------------------------------------------
-- Agregação para o painel — uma função só, retorna jsonb, checando
-- is_admin internamente (nunca confiar só na RLS pra isto: é leitura
-- agregada de todos os usuários, não linha a linha).
-- -----------------------------------------------------------------------
create or replace function admin_get_dashboard_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_usuarios_totais integer;
  v_novos_usuarios_7d integer;
  v_usuarios_ativos_24h integer;
  v_usuarios_ativos_7d integer;
  v_usuarios_ativos_30d integer;
  v_sessoes_30d integer;
  v_tempo_medio_sessao_min numeric;
  v_taxa_sessao_unico_evento_30d numeric;
  v_eventos_propostas_total integer;
  v_eventos_propostas_7d integer;
  v_compromissos_confirmados_total integer;
  v_checkins_total integer;
  v_mensagens_chat_total integer;
  v_fotos_postadas_total integer;
  v_page_views_por_dia jsonb;
  v_top_paginas_7d jsonb;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Acesso restrito ao administrador';
  end if;

  select count(*) into v_usuarios_totais from profiles;
  select count(*) into v_novos_usuarios_7d from profiles where criado_em > now() - interval '7 days';

  select count(distinct user_id) into v_usuarios_ativos_24h
  from analytics_events where criado_em > now() - interval '24 hours' and user_id is not null;

  select count(distinct user_id) into v_usuarios_ativos_7d
  from analytics_events where criado_em > now() - interval '7 days' and user_id is not null;

  select count(distinct user_id) into v_usuarios_ativos_30d
  from analytics_events where criado_em > now() - interval '30 days' and user_id is not null;

  with sessoes as (
    select session_id, count(*) as n_eventos,
           extract(epoch from (max(criado_em) - min(criado_em))) / 60.0 as duracao_min
    from analytics_events
    where criado_em > now() - interval '30 days'
    group by session_id
  )
  select
    count(*),
    avg(duracao_min) filter (where n_eventos >= 2),
    (count(*) filter (where n_eventos = 1))::numeric / nullif(count(*), 0) * 100
  into v_sessoes_30d, v_tempo_medio_sessao_min, v_taxa_sessao_unico_evento_30d
  from sessoes;

  select count(*) into v_eventos_propostas_total from events;
  select count(*) into v_eventos_propostas_7d from events where criado_em > now() - interval '7 days';

  select count(*) into v_compromissos_confirmados_total
  from commitments where status <> 'cancelado';

  select count(*) into v_checkins_total from commitments where status = 'check-in';

  select count(*) into v_mensagens_chat_total from chat_messages;
  select count(*) into v_fotos_postadas_total from event_photos;

  select coalesce(jsonb_agg(dia_contagem order by dia), '[]'::jsonb) into v_page_views_por_dia
  from (
    select jsonb_build_object('dia', to_char(criado_em::date, 'YYYY-MM-DD'), 'contagem', count(*)) as dia_contagem,
           criado_em::date as dia
    from analytics_events
    where tipo = 'page_view' and criado_em > now() - interval '14 days'
    group by criado_em::date
  ) t;

  select coalesce(jsonb_agg(path_contagem order by contagem desc), '[]'::jsonb) into v_top_paginas_7d
  from (
    select jsonb_build_object('path', coalesce(path, '(desconhecido)'), 'contagem', count(*)) as path_contagem,
           count(*) as contagem
    from analytics_events
    where tipo = 'page_view' and criado_em > now() - interval '7 days'
    group by path
    order by count(*) desc
    limit 8
  ) t;

  return jsonb_build_object(
    'usuariosTotais', v_usuarios_totais,
    'novosUsuarios7d', v_novos_usuarios_7d,
    'usuariosAtivos24h', v_usuarios_ativos_24h,
    'usuariosAtivos7d', v_usuarios_ativos_7d,
    'usuariosAtivos30d', v_usuarios_ativos_30d,
    'sessoes30d', v_sessoes_30d,
    'tempoMedioSessaoMin', round(coalesce(v_tempo_medio_sessao_min, 0)::numeric, 1),
    'taxaSessaoUnicoEvento30d', round(coalesce(v_taxa_sessao_unico_evento_30d, 0)::numeric, 1),
    'eventosPropostasTotal', v_eventos_propostas_total,
    'eventosPropostas7d', v_eventos_propostas_7d,
    'compromissosConfirmadosTotal', v_compromissos_confirmados_total,
    'checkinsTotal', v_checkins_total,
    'taxaCheckin', case when v_compromissos_confirmados_total > 0
      then round((v_checkins_total::numeric / v_compromissos_confirmados_total) * 100, 1)
      else 0 end,
    'mensagensChatTotal', v_mensagens_chat_total,
    'fotosPostadasTotal', v_fotos_postadas_total,
    'pageViewsPorDia', v_page_views_por_dia,
    'topPaginas7d', v_top_paginas_7d
  );
end;
$$;

revoke execute on function admin_get_dashboard_stats() from public;
grant execute on function admin_get_dashboard_stats() to authenticated;
