-- =============================================================================
-- Zuvio — Correção 2: recursão cruzada entre `events` e `commitments`
-- =============================================================================
-- A correção anterior (0002) resolveu a recursão de `commitments`
-- consultando a si mesma, mas a política de `commitments` ainda
-- consultava `events` diretamente, e a política de `events` ainda
-- consultava `commitments` diretamente — formando um ciclo de duas
-- tabelas (events → commitments → events → ...), que o Postgres também
-- rejeita como "infinite recursion detected in policy".
--
-- Correção: TODA consulta cruzada entre `events`, `commitments` e
-- `invites` dentro de políticas de RLS passa a usar funções
-- `security definer` (dona `postgres`, isenta da própria RLS por
-- padrão) em vez de subqueries diretas — isso quebra qualquer ciclo
-- possível entre essas tabelas, para sempre.
-- =============================================================================

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

-- --- events: substitui as subqueries diretas em commitments/invites ---
drop policy if exists "Descoberta pública de eventos não-restritos" on events;

create policy "Descoberta pública de eventos não-restritos"
  on events for select
  to authenticated
  using (
    modalidade <> 'restrita'
    or criador_id = auth.uid()
    or is_event_participant(id, auth.uid())
    or has_redeemed_invite(id, auth.uid())
  );

-- --- commitments: substitui a subquery direta em events ---
drop policy if exists "Ver compromissos de eventos onde participo" on commitments;

create policy "Ver compromissos de eventos onde participo"
  on commitments for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_event_creator(event_id, auth.uid())
    or is_event_participant(event_id, auth.uid())
  );
