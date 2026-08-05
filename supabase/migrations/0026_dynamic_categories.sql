-- =============================================================================
-- Zuvio — Migração 0026: categorias deixam de ser um enum fixo e viram
-- uma tabela administrável (painel admin cria novas categorias gerais
-- além de esporte/viagem/etc.).
-- =============================================================================

create table categories (
  id text primary key,
  nome text not null check (char_length(nome) between 1 and 40),
  emoji text not null,
  cor text not null check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into categories (id, nome, emoji, cor, ordem) values
  ('esporte', 'Esporte', '🏃', '#12E0B2', 1),
  ('viagem', 'Viagem', '✈️', '#FF6B4A', 2),
  ('hobby', 'Hobby', '🎨', '#F0A93A', 3),
  ('encontro', 'Encontro', '☕', '#8A93B8', 4),
  ('estudo', 'Estudo', '📚', '#5A6491', 5),
  ('outro', 'Outro', '✨', '#DCE0F0', 6);

-- public_profiles depende de categorias_interesse — precisa sumir
-- antes do ALTER TYPE e voltar depois, idêntica (mesma definição da
-- migração 0022, security_invoker incluso).
drop view public_profiles;

alter table events alter column categoria type text using categoria::text;
alter table events add constraint events_categoria_fkey
  foreign key (categoria) references categories(id);

alter table profiles alter column categorias_interesse type text[]
  using categorias_interesse::text[];
alter table profiles alter column categorias_interesse set default '{}'::text[];

drop type event_category;

create view public_profiles
  with (security_invoker = true)
  as
  select id, nome, foto_url, genero, localizacao_base, categorias_interesse,
         score_confiabilidade, selo, criado_em
  from profiles;

grant select on public_profiles to authenticated;

-- Helper de RLS no mesmo padrão de is_event_creator/is_group_admin.
create or replace function is_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = p_user_id and is_admin
  );
$$;

revoke execute on function is_admin(uuid) from public;
grant execute on function is_admin(uuid) to authenticated;

alter table categories enable row level security;

create policy "Autenticado lê categorias ativas, admin lê todas"
  on categories for select
  to authenticated
  using (ativo or is_admin((select auth.uid())));

create policy "Só admin cria categoria"
  on categories for insert
  to authenticated
  with check (is_admin((select auth.uid())));

create policy "Só admin edita categoria"
  on categories for update
  to authenticated
  using (is_admin((select auth.uid())))
  with check (is_admin((select auth.uid())));

-- Sem policy de DELETE de propósito: "remover" categoria é desativar
-- (ativo = false) — evita órfãos em events.categoria (FK) e mantém
-- histórico de eventos antigos legível.
