-- =============================================================================
-- Zuvio — Migração 0005: sistema de amigos
-- =============================================================================
-- Modelo:
--   - `friendships`: a amizade em si (aceite mútuo, como o compromisso
--     de eventos) — é o grupo implícito "Amigo", não precisa de uma
--     linha em `friend_groups` para existir.
--   - `friend_groups`: agrupamentos nomeados DENTRO dos amigos de
--     alguém. Todo usuário ganha automaticamente um grupo de sistema
--     "Melhores Amigos" (não pode ser renomeado/excluído); grupos
--     customizados ("Amigos da escola", "Amigos do trabalho") são
--     livres, o usuário nomeia como quiser.
--   - `friend_group_members`: um amigo pode estar em vários grupos ao
--     mesmo tempo.
-- =============================================================================

create type friendship_status as enum ('pendente', 'aceito');

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status friendship_status not null default 'pendente',
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,

  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table friend_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 40),
  is_system boolean not null default false,
  criado_em timestamptz not null default now(),

  unique (owner_id, nome)
);

create table friend_group_members (
  group_id uuid not null references friend_groups(id) on delete cascade,
  friend_user_id uuid not null references profiles(id) on delete cascade,
  criado_em timestamptz not null default now(),

  primary key (group_id, friend_user_id)
);

alter table friendships enable row level security;
alter table friend_groups enable row level security;
alter table friend_group_members enable row level security;

-- --- friendships ---
create policy "Ver amizades onde sou parte"
  on friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "Enviar pedido de amizade"
  on friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

-- Só o destinatário aceita; qualquer um dos dois lados pode
-- desfazer/recusar (tratado como update de status, ou delete).
create policy "Destinatário aceita ou recusa o pedido"
  on friendships for update
  to authenticated
  using (addressee_id = auth.uid() or requester_id = auth.uid())
  with check (addressee_id = auth.uid() or requester_id = auth.uid());

create policy "Qualquer um dos dois lados desfaz a amizade"
  on friendships for delete
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- --- friend_groups ---
create policy "Dono gerencia os próprios grupos de amigos"
  on friend_groups for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- --- friend_group_members ---
-- Consulta `friend_groups` (não a si mesma) para checar posse — sem
-- risco de recursão, já que `friend_groups` não referencia
-- `friend_group_members` de volta.
create policy "Dono gerencia os membros dos próprios grupos"
  on friend_group_members for all
  to authenticated
  using (
    exists (select 1 from friend_groups g where g.id = group_id and g.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from friend_groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Funções
-- -----------------------------------------------------------------------------

-- Checa amizade aceita entre dois usuários, em qualquer direção —
-- security definer para poder ser usada depois em políticas de outras
-- tabelas (ex.: convites por lista de amigos) sem risco de recursão.
create or replace function are_friends(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from friendships
    where status = 'aceito'
      and (
        (requester_id = p_user_a and addressee_id = p_user_b)
        or (requester_id = p_user_b and addressee_id = p_user_a)
      )
  );
$$;

-- Cria o grupo de sistema "Melhores Amigos" automaticamente para todo
-- usuário novo.
create or replace function create_default_friend_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.friend_groups (owner_id, nome, is_system)
  values (new.id, 'Melhores Amigos', true);
  return new;
end;
$$;

create trigger on_profile_created_default_friend_group
  after insert on profiles
  for each row execute function create_default_friend_group();

-- Quando um pedido de amizade é aceito, marca `respondido_em`.
create or replace function set_friendship_responded_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'aceito' and old.status = 'pendente' then
    new.respondido_em := now();
  end if;
  return new;
end;
$$;

create trigger friendships_set_responded_at
  before update of status on friendships
  for each row
  execute function set_friendship_responded_at();
