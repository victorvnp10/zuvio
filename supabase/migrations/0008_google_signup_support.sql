-- =============================================================================
-- Zuvio — Migração 0008: suporte a login com Google
-- =============================================================================
-- `data_nascimento` e `localizacao_base` eram NOT NULL, preenchidos no
-- formulário de cadastro por e-mail/senha. Login com Google não
-- fornece nem um nem outro — o gatilho `handle_new_user` falharia (e
-- travaria o cadastro inteiro) ao tentar inserir um perfil com esses
-- campos nulos.
--
-- Correção: os dois campos passam a ser opcionais no banco. A
-- aplicação trata "perfil incompleto" (`data_nascimento is null`) como
-- um gate — a pessoa é levada para completar antes de usar o resto do
-- app, já que a verificação de idade mínima continua sendo obrigatória
-- por regra de produto, só não pode mais ser feita a nível de coluna.
-- =============================================================================

alter table profiles alter column data_nascimento drop not null;
alter table profiles alter column localizacao_base drop not null;

alter table profiles drop constraint profiles_data_nascimento_check;
alter table profiles add constraint profiles_data_nascimento_check check (
  data_nascimento is null or data_nascimento <= (current_date - interval '18 years')
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, data_nascimento, genero, localizacao_base)
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
    new.raw_user_meta_data->>'localizacao_base'
  );
  return new;
end;
$$;
