-- =============================================================================
-- Zuvio — Migração 0022: dois ajustes de segurança de baixo risco
-- =============================================================================
-- 1) get_own_profile() foi criada sem revogar o grant padrão de EXECUTE
--    para PUBLIC que o Postgres aplica a toda função nova — isso deixava
--    `anon` chamar a RPC (retornaria conjunto vazio, já que auth.uid()
--    é null sem sessão, mas não deveria estar exposta mesmo assim).
-- 2) public_profiles não tem mais motivo pra ser SECURITY DEFINER: ela só
--    expõe colunas que a RLS de `profiles` já libera para qualquer
--    autenticado (a coluna sensível, data_nascimento, já foi revogada na
--    migração 0021). Marcar como security_invoker faz a view respeitar
--    RLS/permissões de quem consulta, fechando o lint sem mudar
--    comportamento nenhum.
-- =============================================================================

revoke execute on function public.get_own_profile() from public;
revoke execute on function public.get_own_profile() from anon;

alter view public.public_profiles set (security_invoker = true);
