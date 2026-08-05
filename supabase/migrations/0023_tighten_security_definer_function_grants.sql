-- =============================================================================
-- Zuvio — Migração 0023: aperta EXECUTE nas funções SECURITY DEFINER
-- restantes sinalizadas pelo advisor, sem quebrar nada — cada função foi
-- classificada por como é usada de verdade antes de mexer:
-- =============================================================================
-- 1) Puramente trigger (retorna `trigger`, nunca chamada via RPC pelo
--    client nem precisa ser): handle_new_user, create_default_friend_group,
--    recompute_event_status_on_edit, trigger_recompute_reliability.
--    Trigger dispara automaticamente pelo Postgres — não depende de
--    EXECUTE do role que fez o INSERT/UPDATE original.
-- 2) Helpers usados só DENTRO de RLS policies (grep confirma: nenhuma
--    chamada `.rpc(...)` no app para essas): are_friends,
--    has_redeemed_invite, is_event_creator, is_event_participant,
--    is_group_admin, is_group_member. Authenticated PRECISA continuar
--    podendo — é o role que roda as próprias policies. Só anon não
--    precisa (nenhuma policy dá acesso de leitura a anon nas tabelas
--    que essas funções apoiam).
-- 3) Ações de usuário logado, chamadas direto pelo client via
--    `.rpc(...)` (grep confirma o uso): commit_to_event,
--    cancel_commitment, checkin_event, confirm_payment, create_group,
--    redeem_invite, redeem_group_invite. App sempre exige login antes
--    — anon não tem motivo de chamar.
-- 4) recompute_reliability: nunca chamada pelo client, só internamente
--    por trigger_recompute_reliability (roda com privilégio de dono,
--    não precisa de grant do role chamador).
-- =============================================================================

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.create_default_friend_group() from anon, authenticated;
revoke execute on function public.recompute_event_status_on_edit() from anon, authenticated;
revoke execute on function public.trigger_recompute_reliability() from anon, authenticated;
revoke execute on function public.recompute_reliability(uuid) from anon, authenticated;

revoke execute on function public.are_friends(uuid, uuid) from anon;
revoke execute on function public.has_redeemed_invite(uuid, uuid) from anon;
revoke execute on function public.is_event_creator(uuid, uuid) from anon;
revoke execute on function public.is_event_participant(uuid, uuid) from anon;
revoke execute on function public.is_group_admin(uuid, uuid) from anon;
revoke execute on function public.is_group_member(uuid, uuid) from anon;

revoke execute on function public.commit_to_event(uuid) from anon;
revoke execute on function public.cancel_commitment(uuid) from anon;
revoke execute on function public.checkin_event(uuid, double precision, double precision) from anon;
revoke execute on function public.confirm_payment(uuid) from anon;
revoke execute on function public.create_group(text, text) from anon;
revoke execute on function public.redeem_invite(text) from anon;
revoke execute on function public.redeem_group_invite(text) from anon;
