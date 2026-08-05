-- =============================================================================
-- Zuvio — Migração 0029: is_admin() e admin_get_dashboard_stats() só
-- tiveram EXECUTE revogado de PUBLIC nas migrações 0026/0028 — mas o
-- Supabase concede EXECUTE via ALTER DEFAULT PRIVILEGES diretamente
-- para anon/authenticated/service_role em toda função nova, à parte
-- do grant a PUBLIC. Revogar só de PUBLIC não tira o de anon (mesma
-- causa-raiz já corrigida pra get_own_profile na migração 0022).
-- =============================================================================

revoke execute on function is_admin(uuid) from anon;
revoke execute on function admin_get_dashboard_stats() from anon;
