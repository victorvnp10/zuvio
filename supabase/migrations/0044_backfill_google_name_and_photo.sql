-- =============================================================================
-- Zuvio — Migração 0044: corrige nome/foto de perfis do Google
-- =============================================================================
-- Dois problemas encontrados, ambos do mesmo tipo: dado que o Google
-- sempre manda no login OAuth, mas que o app nunca puxava pro perfil.
--
-- 1) NOME: quem se cadastrou antes da correção do fallback
--    full_name/name (migração 0043) ficou com `nome = 'Novo usuário'`
--    salvo de verdade no banco — corrigir só o gatilho não conserta
--    quem já existe, porque o gatilho só roda uma vez, no momento do
--    cadastro. Por isso a busca por nome não encontrava essas pessoas:
--    a busca está certa, o dado salvo é que estava errado.
--
-- 2) FOTO: `handle_new_user()` nunca colocou nada em `foto_url` — o
--    Google manda a foto em `raw_user_meta_data->>'avatar_url'` (ou
--    `picture`, dependendo da versão da resposta do OAuth), mas isso
--    nunca foi lido. Por isso NINGUÉM tinha foto, mesmo logando com
--    Google.
--
-- Os dois têm o mesmo formato de correção: backfill retroativo (uma
-- vez, agora) + ajuste no gatilho (pra não voltar a acontecer nos
-- próximos cadastros).
-- =============================================================================

-- --- Backfill: nome ---
update profiles p
set nome = coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
from auth.users u
where u.id = p.id
  and p.nome = 'Novo usuário'
  and coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') is not null;

-- --- Backfill: foto ---
update profiles p
set foto_url = coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where u.id = p.id
  and p.foto_url is null
  and coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') is not null;

-- --- Gatilho: passa a capturar a foto também, daqui pra frente ---
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, foto_url, data_nascimento, genero, localizacao_base, is_admin, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nome',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Novo usuário'
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
    new.raw_user_meta_data->>'genero',
    coalesce(new.raw_user_meta_data->>'localizacao_base', ''),
    new.email = 'victornogueirapinto@gmail.com',
    new.email
  );
  return new;
end;
$$;
