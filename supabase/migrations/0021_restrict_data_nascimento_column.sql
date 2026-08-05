-- =============================================================================
-- Zuvio — Migração 0021: data_nascimento nunca deve ser lida por outro
-- usuário via API, mesmo direto na tabela
-- =============================================================================
-- A view `public_profiles` (migração 0001) já existia pra esconder
-- `data_nascimento` ao mostrar o perfil de OUTRA pessoa — mas RLS filtra
-- LINHA, não coluna: a policy de SELECT em `profiles` libera qualquer
-- linha para qualquer autenticado, e a coluna `data_nascimento` tinha
-- GRANT de SELECT aberto para `authenticated`/`anon`. Resultado: dava
-- pra ignorar a view e pedir `data_nascimento` de qualquer usuário
-- direto na tabela via API REST — furando a garantia que o comentário
-- da 0001 já prometia.
--
-- Como RLS não segura por coluna, a correção é: revogar o GRANT de
-- SELECT da coluna para os dois roles, e expor o valor só para o dono
-- via função `security definer` que filtra por auth.uid() internamente
-- (a única leitura legítima disso hoje é o dono editando o próprio
-- perfil — `ProfileRepository.getOwn`).
-- =============================================================================

create or replace function public.get_own_profile()
returns setof profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from profiles where id = auth.uid();
$$;

grant execute on function public.get_own_profile() to authenticated;

revoke select (data_nascimento) on public.profiles from authenticated, anon;
