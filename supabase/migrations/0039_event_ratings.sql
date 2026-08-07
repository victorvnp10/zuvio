-- Zuvio — Migração 0039 (Avaliação geral do evento)
--
-- Nota de 1 a 5 (+ opinião em texto) sobre o EVENTO COMO UM TODO —
-- diferente de `ratings` (avaliação de PARTICIPANTE, usado pro score
-- de confiabilidade) e de `activity_ratings` (avaliação de uma
-- atividade específica de conferência). Vale pra qualquer tipo de
-- evento, não só conferência. Mesmo padrão de `activity_ratings`
-- (migração 0035): políticas de RLS resolvem o INSERT/UPDATE direto
-- (a única regra é "já fez check-in"), sem precisar de função RPC.

create table event_ratings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  nota smallint not null check (nota >= 1 and nota <= 5),
  comentario text,
  criado_em timestamptz not null default now(),
  unique (event_id, user_id)
);

create index event_ratings_event_id_idx on event_ratings(event_id);
create index event_ratings_user_id_idx on event_ratings(user_id);

alter table event_ratings enable row level security;

-- Vê a própria avaliação, ou (organizador do evento) todas as
-- avaliações — necessário pro resumo/exportação do painel do
-- administrador (Fase 4).
create policy "event_ratings_select" on event_ratings
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from events e where e.id = event_ratings.event_id and e.criador_id = (select auth.uid())
    )
  );

-- Só quem já fez check-in no evento pode avaliar.
create policy "event_ratings_insert" on event_ratings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from commitments
      where event_id = event_ratings.event_id
        and user_id = (select auth.uid())
        and status = 'check-in'
    )
  );

create policy "event_ratings_update" on event_ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Média/contagem pública (sem expor nota ou comentário individual de
-- terceiros) — mesmo padrão "agregado seguro" de
-- `get_activity_rating_summary` (já corrigido na migração 0036 pra
-- respeitar a visibilidade do evento; esta já nasce com a checagem
-- certa, espelhando a política de SELECT de `events`, migração 0013).
create or replace function get_event_rating_summary(p_event_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not exists (
    select 1 from events e
    where e.id = p_event_id
      and (
        e.modalidade in ('estranhos', 'hibrida')
        or e.criador_id = auth.uid()
        or is_event_participant(e.id, auth.uid())
        or has_redeemed_invite(e.id, auth.uid())
        or (e.modalidade = 'amigos' and are_friends(e.criador_id, auth.uid()))
      )
  ) then
    raise exception 'Evento não encontrado';
  end if;

  select jsonb_build_object('media', round(avg(nota)::numeric, 2), 'total', count(*))
  into v_result
  from event_ratings
  where event_id = p_event_id;

  return v_result;
end;
$$;

grant execute on function get_event_rating_summary(uuid) to authenticated;
revoke execute on function get_event_rating_summary(uuid) from public, anon;
