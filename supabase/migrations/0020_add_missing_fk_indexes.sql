-- =============================================================================
-- Zuvio — Migração 0020: índices para foreign keys sem cobertura
-- =============================================================================
-- O Supabase Advisor de performance sinalizou ~23 foreign keys sem
-- índice — toda vez que uma policy de RLS ou uma query do app filtra/
-- junta por essas colunas (ex.: "meus compromissos", "quem denunciou
-- quem"), o Postgres varre a tabela inteira em vez de usar um índice.
-- Não dói ainda com o volume atual de dados, mas é dívida que aparece
-- cedo conforme o app ganha uso.
-- =============================================================================

create index if not exists idx_blocks_blocked_id on public.blocks (blocked_id);
create index if not exists idx_chat_messages_autor_id on public.chat_messages (autor_id);
create index if not exists idx_collaborative_items_criado_por on public.collaborative_items (criado_por);
create index if not exists idx_collaborative_items_reservado_por on public.collaborative_items (reservado_por);
create index if not exists idx_commitments_user_id on public.commitments (user_id);
create index if not exists idx_event_announcements_autor_id on public.event_announcements (autor_id);
create index if not exists idx_event_likes_user_id on public.event_likes (user_id);
create index if not exists idx_event_photo_comments_autor_id on public.event_photo_comments (autor_id);
create index if not exists idx_event_photo_likes_user_id on public.event_photo_likes (user_id);
create index if not exists idx_event_photos_autor_id on public.event_photos (autor_id);
create index if not exists idx_events_criador_id on public.events (criador_id);
create index if not exists idx_friend_group_members_friend_user_id on public.friend_group_members (friend_user_id);
create index if not exists idx_friendships_addressee_id on public.friendships (addressee_id);
create index if not exists idx_group_invites_criado_por on public.group_invites (criado_por);
create index if not exists idx_group_invites_group_id on public.group_invites (group_id);
create index if not exists idx_group_members_user_id on public.group_members (user_id);
create index if not exists idx_groups_criador_id on public.groups (criador_id);
create index if not exists idx_invites_criado_por on public.invites (criado_por);
create index if not exists idx_invites_event_id on public.invites (event_id);
create index if not exists idx_ratings_avaliado_id on public.ratings (avaliado_id);
create index if not exists idx_ratings_avaliador_id on public.ratings (avaliador_id);
create index if not exists idx_reports_denunciado_id on public.reports (denunciado_id);
create index if not exists idx_reports_denunciante_id on public.reports (denunciante_id);
create index if not exists idx_reports_event_id on public.reports (event_id);
