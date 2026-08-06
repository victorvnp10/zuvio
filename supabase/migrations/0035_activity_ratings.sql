-- Zuvio — Migração 0035 (Fase 3 do módulo de Conferência: avaliação por atividade)
--
-- Nota de 1 a 5 (+ comentário opcional) sobre a ATIVIDADE em si (a
-- qualidade da palestra/oficina) — diferente do `ratings` que já
-- existia (aquele é avaliação de PARTICIPANTE, "como foi ter fulano no
-- seu evento", usado pro score de confiabilidade). Conceito novo, sem
-- relação com o antigo.
--
-- Só quem fez check-in na atividade pode avaliar (RLS garante isso
-- direto no INSERT — não precisa de função). Comentário fica visível
-- só pra quem escreveu e pro organizador (é feedback direcionado, não
-- uma resenha pública); a média/contagem, sim, é pública pra quem
-- enxerga a atividade — via função agregadora que nunca expõe nota ou
-- comentário individual de outra pessoa.

create table activity_ratings (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references conference_activities(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  nota smallint not null check (nota >= 1 and nota <= 5),
  comentario text,
  criado_em timestamptz not null default now(),
  unique (activity_id, user_id)
);

create index activity_ratings_activity_id_idx on activity_ratings(activity_id);
create index activity_ratings_user_id_idx on activity_ratings(user_id);

alter table activity_ratings enable row level security;

-- Vê a própria avaliação, ou (organizador do evento) todas as
-- avaliações das atividades da própria conferência — necessário pra
-- exportação em lote da Fase 4.
create policy "activity_ratings_select" on activity_ratings
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from conference_activities ca
      join events e on e.id = ca.event_id
      where ca.id = activity_ratings.activity_id and e.criador_id = (select auth.uid())
    )
  );

-- Só quem já fez check-in na atividade pode avaliar — dá pra checar
-- direto na RLS (sem precisar de função) porque não tem nenhuma regra
-- de geo/horário envolvida aqui, só essa checagem simples.
create policy "activity_ratings_insert" on activity_ratings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from activity_checkins
      where activity_id = activity_ratings.activity_id and user_id = (select auth.uid())
    )
  );

create policy "activity_ratings_update" on activity_ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Média/contagem pública (sem expor nota ou comentário individual de
-- terceiros) — mesmo padrão de "agregado seguro" de `admin_get_dashboard_stats`.
create or replace function get_activity_rating_summary(p_activity_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'media', round(avg(nota)::numeric, 2),
    'total', count(*)
  )
  from activity_ratings
  where activity_id = p_activity_id;
$$;

grant execute on function get_activity_rating_summary(uuid) to authenticated;
revoke execute on function get_activity_rating_summary(uuid) from public, anon;
