-- =============================================================================
-- Zuvio — Migração 0016: grupos compartilhados (estilo WhatsApp)
-- =============================================================================
-- Diferente de `friend_groups` (marcadores PESSOAIS que cada usuário usa
-- pra organizar a própria lista de amigos — "Melhores Amigos", "Amigos
-- do trabalho" — e que só existem pra quem os criou), `groups` aqui é
-- uma entidade COMPARTILHADA entre várias pessoas: quem cria vira
-- administrador, pode adicionar/remover membros diretamente OU gerar um
-- link de convite reutilizável (compartilhável por e-mail, WhatsApp
-- etc.) — igual à mecânica de grupo do WhatsApp. Qualquer usuário pode
-- criar quantos grupos quiser e pertencer a vários ao mesmo tempo.
--
-- Não existe hierarquia "comunidade → grupos" (isso foi perguntado e
-- descartado): ter conta no Zuvio já é "estar na comunidade"; o grupo é
-- a única entidade nova.
-- =============================================================================

create type group_member_role as enum ('admin', 'membro');

create table groups (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references profiles(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  descricao text check (descricao is null or char_length(descricao) <= 300),
  foto_url text,
  criado_em timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  papel group_member_role not null default 'membro',
  entrou_em timestamptz not null default now(),

  primary key (group_id, user_id)
);

-- Link de convite reutilizável (não expira sozinho — o admin revoga
-- desativando `ativo` e gerando um novo, igual ao "redefinir link" do
-- WhatsApp). Código em hex (não base64) de propósito: base64 padrão
-- pode gerar `/` e `+`, que quebram o path da URL.
create table group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  criado_por uuid not null references profiles(id) on delete cascade,
  codigo text not null unique default encode(gen_random_bytes(9), 'hex'),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_invites enable row level security;

-- -----------------------------------------------------------------------------
-- Funções de segurança reutilizáveis (evitam recursão de RLS — mesmo
-- padrão de `is_event_creator`/`are_friends` da migração 0005).
-- -----------------------------------------------------------------------------

create or replace function is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from group_members where group_id = p_group_id and user_id = p_user_id
  );
$$;

create or replace function is_group_admin(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = p_user_id and papel = 'admin'
  );
$$;

-- --- groups ---
create policy "Membros veem o grupo"
  on groups for select
  to authenticated
  using (is_group_member(id, auth.uid()));

create policy "Admin edita o grupo"
  on groups for update
  to authenticated
  using (is_group_admin(id, auth.uid()))
  with check (is_group_admin(id, auth.uid()));

create policy "Admin exclui o grupo"
  on groups for delete
  to authenticated
  using (is_group_admin(id, auth.uid()));

-- Inserção direta em `groups` fica fechada — sempre passa pela função
-- `create_group` (abaixo), que cria o grupo E já insere o criador como
-- admin numa transação só, sem depender de duas políticas separadas.

-- --- group_members ---
create policy "Membros veem os outros membros do mesmo grupo"
  on group_members for select
  to authenticated
  using (is_group_member(group_id, auth.uid()));

-- Admin adiciona gente diretamente (sem precisar de link de convite).
create policy "Admin adiciona membros diretamente"
  on group_members for insert
  to authenticated
  with check (is_group_admin(group_id, auth.uid()));

-- Admin muda papel (promove/rebaixa outro membro).
create policy "Admin gerencia papel dos membros"
  on group_members for update
  to authenticated
  using (is_group_admin(group_id, auth.uid()))
  with check (is_group_admin(group_id, auth.uid()));

-- Pessoa sai por conta própria, OU admin remove qualquer um (inclusive
-- a si mesmo, saindo do próprio grupo).
create policy "Sai do grupo ou é removido pelo admin"
  on group_members for delete
  to authenticated
  using (user_id = auth.uid() or is_group_admin(group_id, auth.uid()));

-- --- group_invites ---
create policy "Membros veem o convite do grupo"
  on group_invites for select
  to authenticated
  using (is_group_member(group_id, auth.uid()));

create policy "Admin cria convites"
  on group_invites for insert
  to authenticated
  with check (is_group_admin(group_id, auth.uid()) and criado_por = auth.uid());

create policy "Admin revoga ou reativa convites"
  on group_invites for update
  to authenticated
  using (is_group_admin(group_id, auth.uid()))
  with check (is_group_admin(group_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- Funções de ação
-- -----------------------------------------------------------------------------

-- Cria o grupo e já insere o criador como admin, atômico — evita ter
-- que abrir uma política de insert direta em `group_members` só pra
-- esse caso (que exigiria checar "sou o criador do grupo que acabei de
-- criar", mais complicado que simplesmente fazer os dois inserts aqui
-- dentro, como super-usuário).
create or replace function create_group(p_nome text, p_descricao text default null)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group groups%rowtype;
begin
  insert into groups (criador_id, nome, descricao)
  values (auth.uid(), p_nome, p_descricao)
  returning * into v_group;

  insert into group_members (group_id, user_id, papel)
  values (v_group.id, auth.uid(), 'admin');

  return v_group;
end;
$$;

-- Resgata um convite de grupo (via link) — funciona tanto pra quem já
-- tem conta (entra direto) quanto pra quem acabou de se cadastrar
-- vindo do link (mesmo fluxo de sessionStorage já usado pros convites
-- de evento restrito, ver PENDING_INVITE_KEY no app). Reentrar com o
-- mesmo link não duplica (on conflict do nothing).
create or replace function redeem_group_invite(p_codigo text)
returns uuid -- retorna group_id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite group_invites%rowtype;
begin
  select * into v_invite from group_invites where codigo = p_codigo and ativo for update;

  if v_invite.id is null then
    raise exception 'Convite inválido ou revogado';
  end if;

  insert into group_members (group_id, user_id, papel)
  values (v_invite.group_id, auth.uid(), 'membro')
  on conflict (group_id, user_id) do nothing;

  return v_invite.group_id;
end;
$$;
