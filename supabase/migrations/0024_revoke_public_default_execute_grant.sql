-- =============================================================================
-- Zuvio — Migração 0024: corrige a 0023 — revogar de um role específico
-- (anon/authenticated) não remove o acesso: Postgres concede EXECUTE a
-- PUBLIC por padrão em toda função nova, e esse grant "coringa" (`=X`
-- no ACL) continua valendo pra qualquer role até ser revogado
-- explicitamente. A 0023 só tirou os grants nomeados; o PUBLIC ficou.
-- Confirmado consultando pg_proc.proacl antes de aplicar isso — depois
-- de rodar, has_function_privilege('anon', ..., 'EXECUTE') virou false
-- pra todas as 19, mantendo authenticated true só onde faz sentido.
-- =============================================================================

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.create_default_friend_group() from public;
revoke execute on function public.recompute_event_status_on_edit() from public;
revoke execute on function public.trigger_recompute_reliability() from public;
revoke execute on function public.recompute_reliability(uuid) from public;

revoke execute on function public.are_friends(uuid, uuid) from public;
revoke execute on function public.has_redeemed_invite(uuid, uuid) from public;
revoke execute on function public.is_event_creator(uuid, uuid) from public;
revoke execute on function public.is_event_participant(uuid, uuid) from public;
revoke execute on function public.is_group_admin(uuid, uuid) from public;
revoke execute on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.has_redeemed_invite(uuid, uuid) to authenticated;
grant execute on function public.is_event_creator(uuid, uuid) to authenticated;
grant execute on function public.is_event_participant(uuid, uuid) to authenticated;
grant execute on function public.is_group_admin(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;

revoke execute on function public.commit_to_event(uuid) from public;
revoke execute on function public.cancel_commitment(uuid) from public;
revoke execute on function public.checkin_event(uuid, double precision, double precision) from public;
revoke execute on function public.confirm_payment(uuid) from public;
revoke execute on function public.create_group(text, text) from public;
revoke execute on function public.redeem_invite(text) from public;
revoke execute on function public.redeem_group_invite(text) from public;
grant execute on function public.commit_to_event(uuid) to authenticated;
grant execute on function public.cancel_commitment(uuid) to authenticated;
grant execute on function public.checkin_event(uuid, double precision, double precision) to authenticated;
grant execute on function public.confirm_payment(uuid) to authenticated;
grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.redeem_group_invite(text) to authenticated;
