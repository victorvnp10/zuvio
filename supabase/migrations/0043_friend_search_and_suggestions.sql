-- =============================================================================
-- Zuvio — Migração 0043: busca por nome/e-mail + ranqueamento por
-- proximidade + sugestões de amizade
-- =============================================================================
-- Pedido: um único campo de busca que ache por nome OU e-mail, entre
-- TODOS os cadastrados, ordenado por proximidade de rede de amigos
-- primeiro, depois localização, depois qualquer outra proximidade — e
-- que a página de Amigos mostre sugestões (mesma lógica de
-- proximidade) mesmo sem busca ativa.
--
-- Ponto delicado de segurança: e-mail não pode virar um jeito de
-- varrer todos os e-mails do sistema (enumeração). Por isso:
--   - a coluna `profiles.email` é adicionada, mas o GRANT de SELECT
--     nela é revogado pra authenticated/anon na hora (mesmo padrão já
--     usado pra `data_nascimento` na migração 0021) — só a função
--     `security definer` abaixo consegue ler.
--   - a busca por e-mail exige o e-mail EXATO e completo (comparação
--     de igualdade, nunca ILIKE/wildcard) — sem isso, digitar "a"
--     devolveria todo mundo com "a" no e-mail.
--   - o e-mail em si nunca é devolvido no resultado da busca, só serve
--     de critério de correspondência.
-- =============================================================================

alter table profiles add column email text;

update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

revoke select (email) on public.profiles from authenticated, anon;

-- Reaproveitando a passagem por esta função para restaurar o fallback
-- full_name/name (perdido numa reescrita anterior, migração 0027 —
-- login com Google manda o nome nesses campos, não em "nome") e um
-- nullif de segurança em data_nascimento (string vazia quebraria o
-- cast para date).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, data_nascimento, genero, localizacao_base, is_admin, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nome',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Novo usuário'
    ),
    nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
    new.raw_user_meta_data->>'genero',
    coalesce(new.raw_user_meta_data->>'localizacao_base', ''),
    new.email = 'victornogueirapinto@gmail.com',
    new.email
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Busca geral (nome parcial OU e-mail exato), ranqueada por proximidade
-- -----------------------------------------------------------------------------
create or replace function search_profiles_ranked(p_query text, p_limit int default 30)
returns table (
  id uuid,
  nome text,
  foto_url text,
  localizacao_base text,
  genero text,
  categorias_interesse text[],
  score_confiabilidade integer,
  selo trust_badge,
  criado_em timestamptz,
  amigos_em_comum integer
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_location text;
  v_is_email boolean := position('@' in coalesce(p_query, '')) > 0;
begin
  select p.localizacao_base into v_caller_location from profiles p where p.id = v_caller;

  return query
  with my_friends as (
    select case when f.requester_id = v_caller then f.addressee_id else f.requester_id end as friend_id
    from friendships f
    where f.status = 'aceito' and (f.requester_id = v_caller or f.addressee_id = v_caller)
  )
  select
    pr.id, pr.nome, pr.foto_url, pr.localizacao_base, pr.genero,
    pr.categorias_interesse, pr.score_confiabilidade, pr.selo, pr.criado_em,
    (
      select count(*)::int from friendships f2
      where f2.status = 'aceito'
        and (
          (f2.requester_id = pr.id and f2.addressee_id in (select friend_id from my_friends))
          or (f2.addressee_id = pr.id and f2.requester_id in (select friend_id from my_friends))
        )
    ) as amigos_em_comum
  from profiles pr
  where pr.id <> v_caller
    and (
      p_query is null or btrim(p_query) = ''
      or pr.nome ilike '%' || p_query || '%'
      or (v_is_email and lower(pr.email) = lower(p_query))
    )
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = v_caller and b.blocked_id = pr.id)
         or (b.blocker_id = pr.id and b.blocked_id = v_caller)
    )
  order by
    amigos_em_comum desc,
    (v_caller_location is not null and pr.localizacao_base is not null
       and lower(pr.localizacao_base) = lower(v_caller_location)) desc,
    pr.criado_em desc
  limit p_limit;
end;
$$;

-- -----------------------------------------------------------------------------
-- Sugestões de amizade (sem busca ativa) — mesma lógica de proximidade,
-- excluindo quem já é amigo ou já tem pedido pendente em qualquer direção
-- -----------------------------------------------------------------------------
create or replace function suggest_friends(p_limit int default 10)
returns table (
  id uuid,
  nome text,
  foto_url text,
  localizacao_base text,
  genero text,
  categorias_interesse text[],
  score_confiabilidade integer,
  selo trust_badge,
  criado_em timestamptz,
  amigos_em_comum integer
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_location text;
begin
  select p.localizacao_base into v_caller_location from profiles p where p.id = v_caller;

  return query
  with my_friends as (
    select case when f.requester_id = v_caller then f.addressee_id else f.requester_id end as friend_id
    from friendships f
    where f.status = 'aceito' and (f.requester_id = v_caller or f.addressee_id = v_caller)
  )
  select
    pr.id, pr.nome, pr.foto_url, pr.localizacao_base, pr.genero,
    pr.categorias_interesse, pr.score_confiabilidade, pr.selo, pr.criado_em,
    (
      select count(*)::int from friendships f2
      where f2.status = 'aceito'
        and (
          (f2.requester_id = pr.id and f2.addressee_id in (select friend_id from my_friends))
          or (f2.addressee_id = pr.id and f2.requester_id in (select friend_id from my_friends))
        )
    ) as amigos_em_comum
  from profiles pr
  where pr.id <> v_caller
    and not exists (
      select 1 from friendships f
      where (f.requester_id = v_caller and f.addressee_id = pr.id)
         or (f.requester_id = pr.id and f.addressee_id = v_caller)
    )
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = v_caller and b.blocked_id = pr.id)
         or (b.blocker_id = pr.id and b.blocked_id = v_caller)
    )
  order by
    amigos_em_comum desc,
    (v_caller_location is not null and pr.localizacao_base is not null
       and lower(pr.localizacao_base) = lower(v_caller_location)) desc,
    pr.criado_em desc
  limit p_limit;
end;
$$;

-- Mesmo padrão de grants das migrações 0023/0024: revoga o EXECUTE
-- padrão de PUBLIC e concede só para authenticated.
revoke execute on function search_profiles_ranked(text, int) from public;
revoke execute on function suggest_friends(int) from public;
grant execute on function search_profiles_ranked(text, int) to authenticated;
grant execute on function suggest_friends(int) to authenticated;
