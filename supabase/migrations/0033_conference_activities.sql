-- Zuvio — Migração 0033 (Fase 1 do módulo de Conferência, parte 2/2)
--
-- Uma Conferência é um `events` normal (tipo_evento = 'conferencia') —
-- reaproveita feed, chat, quórum, comprometimento — com uma tabela
-- nova pendurada nela pra representar a programação: várias atividades
-- (título, descrição, local, capa, início/fim), possivelmente
-- espalhadas por vários dias. Check-in por atividade, avaliação e
-- certificado ficam para as próximas fases — esta migração só cria a
-- fundação (o cadastro das atividades em si).

-- 1) A conferência como um todo pode durar mais de um dia — `data_hora`
--    (já existente) continua sendo o início; `data_hora_fim` é só
--    preenchida quando `tipo_evento = 'conferencia'`.
alter table events add column data_hora_fim timestamptz;

alter table events add constraint conferencia_tem_data_fim check (
  tipo_evento <> 'conferencia' or data_hora_fim is not null
);

alter table events add constraint data_fim_apos_inicio check (
  data_hora_fim is null or data_hora_fim >= data_hora
);

-- 2) Atividades da conferência.
create table conference_activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  titulo text not null check (char_length(titulo) >= 3 and char_length(titulo) <= 80),
  descricao text not null default '',
  local text not null check (char_length(local) >= 1),
  geo_lat double precision,
  geo_lng double precision,
  capa_url text,
  data_hora_inicio timestamptz not null,
  data_hora_fim timestamptz not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  check (data_hora_fim > data_hora_inicio)
);

create index conference_activities_event_id_idx on conference_activities(event_id);
-- Ordena a programação por dia/horário sem varrer tudo — é a consulta
-- mais comum (tela de programação, agrupada por dia).
create index conference_activities_event_id_inicio_idx on conference_activities(event_id, data_hora_inicio);

alter table conference_activities enable row level security;

-- Ver as atividades de um evento segue exatamente a mesma regra de ver
-- o evento em si — o EXISTS já herda a RLS de `events` (não precisa
-- duplicar a lógica de modalidade/convite aqui).
create policy "conference_activities_select" on conference_activities
  for select to authenticated
  using (exists (select 1 from events e where e.id = conference_activities.event_id));

create policy "conference_activities_insert" on conference_activities
  for insert to authenticated
  with check (
    exists (
      select 1 from events e
      where e.id = conference_activities.event_id
        and e.criador_id = (select auth.uid())
        and e.tipo_evento = 'conferencia'
    )
  );

create policy "conference_activities_update" on conference_activities
  for update to authenticated
  using (
    exists (
      select 1 from events e
      where e.id = conference_activities.event_id and e.criador_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from events e
      where e.id = conference_activities.event_id and e.criador_id = (select auth.uid())
    )
  );

create policy "conference_activities_delete" on conference_activities
  for delete to authenticated
  using (
    exists (
      select 1 from events e
      where e.id = conference_activities.event_id and e.criador_id = (select auth.uid())
    )
  );
