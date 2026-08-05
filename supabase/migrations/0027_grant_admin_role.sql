-- =============================================================================
-- Zuvio — Migração 0027: gestor da plataforma (painel admin).
-- E-mail fixo por enquanto (um gestor só) — vira lista/tabela de admins
-- se algum dia precisar de mais de um.
-- =============================================================================

update profiles set is_admin = true
where id = (select id from auth.users where email = 'victornogueirapinto@gmail.com');

-- Auto-concede admin nesse e-mail específico em qualquer novo signup
-- (cobre o caso de recriar a conta ou rodar isso num ambiente novo).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, data_nascimento, genero, localizacao_base, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Novo usuário'),
    (new.raw_user_meta_data->>'data_nascimento')::date,
    new.raw_user_meta_data->>'genero',
    coalesce(new.raw_user_meta_data->>'localizacao_base', ''),
    new.email = 'victornogueirapinto@gmail.com'
  );
  return new;
end;
$$;
