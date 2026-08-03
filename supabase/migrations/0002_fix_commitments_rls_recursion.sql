-- =============================================================================
-- Zuvio — Correção: recursão infinita na política de RLS de `commitments`
-- =============================================================================
-- A política antiga de SELECT em `commitments` continha uma subquery que
-- consultava a PRÓPRIA tabela `commitments` (para checar "outros
-- participantes do mesmo evento"). O Postgres não permite isso — gera
-- "infinite recursion detected in policy for relation commitments",
-- que o PostgREST expõe ao cliente como erro 500 genérico.
--
-- Isso afetava qualquer leitura de `events` também, porque a política
-- de `events` consulta `commitments`, o que por sua vez disparava a
-- política recursiva de `commitments`.
--
-- Correção: uma função `security definer` (dona `postgres`, isenta da
-- própria RLS por padrão) faz essa checagem sem re-disparar a política
-- de `commitments` sobre si mesma — o jeito documentado pelo próprio
-- Supabase de evitar esse tipo de recursão.
-- =============================================================================

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

drop policy if exists "Ver compromissos de eventos onde participo" on commitments;

create policy "Ver compromissos de eventos onde participo"
  on commitments for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from events e where e.id = event_id and e.criador_id = auth.uid()
    )
    or is_event_participant(event_id, auth.uid())
  );
