-- =============================================================================
-- Zuvio — Migração 0019: performance de RLS (auth_rls_initplan), políticas
-- permissivas duplicadas e search_path mutável
-- =============================================================================
-- O Supabase Advisor sinalizou que praticamente toda policy chama
-- auth.uid() diretamente, o que faz o Postgres reavaliar a função PARA
-- CADA LINHA da tabela. Envolver em `(select auth.uid())` faz o planner
-- resolver o valor uma única vez por statement (InitPlan), mesmo
-- resultado, mais barato conforme as tabelas crescem.
--
-- Também corrige duas tabelas (event_likes, event_photo_likes) que
-- tinham uma policy FOR ALL e outra FOR SELECT cobrindo a mesma ação
-- (SELECT) ao mesmo tempo — o Postgres avalia as duas em toda leitura.
-- A policy FOR ALL vira três policies específicas (insert/update/delete),
-- deixando a policy de SELECT já existente como única dona da leitura.
--
-- E fixa o search_path mutável de set_friendship_responded_at (lint de
-- segurança) — sem SET search_path, uma function SECURITY DEFINER (ou
-- chamada em contexto elevado) pode ser enganada por um schema criado
-- na frente do search_path da sessão.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------
alter policy "Usuário gerencia os próprios bloqueios" on public.blocks
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
alter policy "Participantes confirmados ou o organizador escrevem no chat lib" on public.chat_messages
  with check (
    (autor_id = (select auth.uid()))
    and exists (
      select 1 from events e
      where e.id = chat_messages.event_id
        and e.status = any (array['quorum_atingido'::event_status, 'fechado'::event_status, 'concluido'::event_status])
    )
    and (
      is_event_creator(event_id, (select auth.uid()))
      or exists (
        select 1 from commitments c
        where c.event_id = chat_messages.event_id
          and c.user_id = (select auth.uid())
          and c.status = any (array['confirmado'::commitment_status, 'check-in'::commitment_status])
      )
    )
  );

alter policy "Participantes confirmados ou o organizador leem o chat liberado" on public.chat_messages
  using (
    exists (
      select 1 from events e
      where e.id = chat_messages.event_id
        and e.status = any (array['quorum_atingido'::event_status, 'fechado'::event_status, 'concluido'::event_status])
    )
    and (
      is_event_creator(event_id, (select auth.uid()))
      or exists (
        select 1 from commitments c
        where c.event_id = chat_messages.event_id
          and c.user_id = (select auth.uid())
          and c.status = any (array['confirmado'::commitment_status, 'check-in'::commitment_status])
      )
    )
  );

-- ---------------------------------------------------------------------------
-- collaborative_items
-- ---------------------------------------------------------------------------
alter policy "Adicionar item na lista colaborativa" on public.collaborative_items
  with check (
    (criado_por = (select auth.uid()))
    and (
      is_event_creator(event_id, (select auth.uid()))
      or (
        is_event_participant(event_id, (select auth.uid()))
        and exists (
          select 1 from events e
          where e.id = collaborative_items.event_id
            and e.modo_lista_colaborativa = any (array['livre'::modo_lista_colaborativa, 'mista'::modo_lista_colaborativa])
        )
      )
    )
  );

alter policy "Participantes veem a lista colaborativa" on public.collaborative_items
  using (
    is_event_creator(event_id, (select auth.uid()))
    or is_event_participant(event_id, (select auth.uid()))
  );

alter policy "Remover item que eu criei (ou sou o organizador)" on public.collaborative_items
  using (
    (criado_por = (select auth.uid()))
    or is_event_creator(event_id, (select auth.uid()))
  );

alter policy "Reservar ou liberar um item" on public.collaborative_items
  using (
    is_event_participant(event_id, (select auth.uid()))
    or is_event_creator(event_id, (select auth.uid()))
  )
  with check (
    (reservado_por = (select auth.uid()))
    or (reservado_por is null)
  );

-- ---------------------------------------------------------------------------
-- commitments
-- ---------------------------------------------------------------------------
alter policy "Ver compromissos de eventos onde participo" on public.commitments
  using (
    (user_id = (select auth.uid()))
    or is_event_creator(event_id, (select auth.uid()))
    or is_event_participant(event_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- event_announcements
-- ---------------------------------------------------------------------------
alter policy "Organizador apaga o próprio aviso" on public.event_announcements
  using (is_event_creator(event_id, (select auth.uid())));

alter policy "Organizador ou participantes leem os avisos" on public.event_announcements
  using (
    is_event_creator(event_id, (select auth.uid()))
    or is_event_participant(event_id, (select auth.uid()))
  );

alter policy "Só o organizador posta avisos" on public.event_announcements
  with check (
    (autor_id = (select auth.uid()))
    and is_event_creator(event_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- event_likes: dedupe (FOR ALL + FOR SELECT sobrepostas em SELECT)
-- ---------------------------------------------------------------------------
drop policy "Cada um só curte/descurte por si" on public.event_likes;

create policy "Curtir evento" on public.event_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Atualizar a própria curtida de evento" on public.event_likes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Descurtir evento" on public.event_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- policy de SELECT ("Qualquer autenticado vê as curtidas") já usa
-- `true`, sem chamada a auth.*, não precisa de alteração.

-- ---------------------------------------------------------------------------
-- event_photo_comments
-- ---------------------------------------------------------------------------
alter policy "Autor do comentário ou organizador do evento remove" on public.event_photo_comments
  using (
    (autor_id = (select auth.uid()))
    or exists (
      select 1 from event_photos p
      where p.id = event_photo_comments.photo_id
        and is_event_creator(p.event_id, (select auth.uid()))
    )
  );

alter policy "Quem vê a foto comenta" on public.event_photo_comments
  with check (
    (autor_id = (select auth.uid()))
    and exists (
      select 1 from event_photos p
      where p.id = event_photo_comments.photo_id
        and (
          p.visibilidade = 'publica'::foto_visibilidade
          or is_event_creator(p.event_id, (select auth.uid()))
          or is_event_participant(p.event_id, (select auth.uid()))
        )
    )
  );

alter policy "Quem vê a foto lê os comentários" on public.event_photo_comments
  using (
    exists (
      select 1 from event_photos p
      where p.id = event_photo_comments.photo_id
        and (
          p.visibilidade = 'publica'::foto_visibilidade
          or is_event_creator(p.event_id, (select auth.uid()))
          or is_event_participant(p.event_id, (select auth.uid()))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- event_photo_likes: dedupe (mesmo padrão de event_likes)
-- ---------------------------------------------------------------------------
drop policy "Cada um só curte/descurte foto por si" on public.event_photo_likes;

create policy "Curtir foto" on public.event_photo_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from event_photos p
      where p.id = event_photo_likes.photo_id
        and (
          p.visibilidade = 'publica'::foto_visibilidade
          or is_event_creator(p.event_id, (select auth.uid()))
          or is_event_participant(p.event_id, (select auth.uid()))
        )
    )
  );

create policy "Atualizar a própria curtida de foto" on public.event_photo_likes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from event_photos p
      where p.id = event_photo_likes.photo_id
        and (
          p.visibilidade = 'publica'::foto_visibilidade
          or is_event_creator(p.event_id, (select auth.uid()))
          or is_event_participant(p.event_id, (select auth.uid()))
        )
    )
  );

create policy "Descurtir foto" on public.event_photo_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

alter policy "Quem vê a foto pode ver quem curtiu" on public.event_photo_likes
  using (
    exists (
      select 1 from event_photos p
      where p.id = event_photo_likes.photo_id
        and (
          p.visibilidade = 'publica'::foto_visibilidade
          or is_event_creator(p.event_id, (select auth.uid()))
          or is_event_participant(p.event_id, (select auth.uid()))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- event_photos
-- ---------------------------------------------------------------------------
alter policy "Autor da foto ou organizador do evento remove" on public.event_photos
  using (
    (autor_id = (select auth.uid()))
    or is_event_creator(event_id, (select auth.uid()))
  );

alter policy "Fotos: público se o organizador liberou, senão só quem parti" on public.event_photos
  using (
    exists (
      select 1 from events e
      where e.id = event_photos.event_id
        and (
          e.fotos_publicas
          or is_event_creator(event_photos.event_id, (select auth.uid()))
          or is_event_participant(event_photos.event_id, (select auth.uid()))
        )
    )
  );

alter policy "Participante confirmado ou organizador posta foto" on public.event_photos
  with check (
    (autor_id = (select auth.uid()))
    and (
      is_event_creator(event_id, (select auth.uid()))
      or is_event_participant(event_id, (select auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
alter policy "Criador edita a própria proposta" on public.events
  using (criador_id = (select auth.uid()))
  with check (criador_id = (select auth.uid()));

alter policy "Criador exclui de verdade evento sem quórum atingido" on public.events
  using (
    (criador_id = (select auth.uid()))
    and (status = 'aberto'::event_status)
  );

alter policy "Descoberta pública respeitando a modalidade" on public.events
  using (
    (modalidade = any (array['estranhos'::event_modality, 'hibrida'::event_modality]))
    or (criador_id = (select auth.uid()))
    or is_event_participant(id, (select auth.uid()))
    or has_redeemed_invite(id, (select auth.uid()))
    or ((modalidade = 'amigos'::event_modality) and are_friends(criador_id, (select auth.uid())))
  );

alter policy "Usuário autenticado cria proposta" on public.events
  with check (criador_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- friend_group_members / friend_groups
-- ---------------------------------------------------------------------------
alter policy "Dono gerencia os membros dos próprios grupos" on public.friend_group_members
  using (
    exists (
      select 1 from friend_groups g
      where g.id = friend_group_members.group_id and g.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from friend_groups g
      where g.id = friend_group_members.group_id and g.owner_id = (select auth.uid())
    )
  );

alter policy "Dono gerencia os próprios grupos de amigos" on public.friend_groups
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------
alter policy "Destinatário aceita ou recusa o pedido" on public.friendships
  using (
    (addressee_id = (select auth.uid())) or (requester_id = (select auth.uid()))
  )
  with check (
    (addressee_id = (select auth.uid())) or (requester_id = (select auth.uid()))
  );

alter policy "Enviar pedido de amizade" on public.friendships
  with check (requester_id = (select auth.uid()));

alter policy "Qualquer um dos dois lados desfaz a amizade" on public.friendships
  using (
    (requester_id = (select auth.uid())) or (addressee_id = (select auth.uid()))
  );

alter policy "Ver amizades onde sou parte" on public.friendships
  using (
    (requester_id = (select auth.uid())) or (addressee_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- group_invites / group_members / groups
-- ---------------------------------------------------------------------------
alter policy "Admin cria convites" on public.group_invites
  with check (
    is_group_admin(group_id, (select auth.uid())) and (criado_por = (select auth.uid()))
  );

alter policy "Admin revoga ou reativa convites" on public.group_invites
  using (is_group_admin(group_id, (select auth.uid())))
  with check (is_group_admin(group_id, (select auth.uid())));

alter policy "Membros veem o convite do grupo" on public.group_invites
  using (is_group_member(group_id, (select auth.uid())));

alter policy "Admin adiciona membros diretamente" on public.group_members
  with check (is_group_admin(group_id, (select auth.uid())));

alter policy "Admin gerencia papel dos membros" on public.group_members
  using (is_group_admin(group_id, (select auth.uid())))
  with check (is_group_admin(group_id, (select auth.uid())));

alter policy "Membros veem os outros membros do mesmo grupo" on public.group_members
  using (is_group_member(group_id, (select auth.uid())));

alter policy "Sai do grupo ou é removido pelo admin" on public.group_members
  using (
    (user_id = (select auth.uid())) or is_group_admin(group_id, (select auth.uid()))
  );

alter policy "Admin edita o grupo" on public.groups
  using (is_group_admin(id, (select auth.uid())))
  with check (is_group_admin(id, (select auth.uid())));

alter policy "Admin exclui o grupo" on public.groups
  using (is_group_admin(id, (select auth.uid())));

alter policy "Membros veem o grupo" on public.groups
  using (is_group_member(id, (select auth.uid())));

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------
alter policy "Criador do convite gerencia seus convites" on public.invites
  using (criado_por = (select auth.uid()))
  with check (criado_por = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter policy "Usuário cria o próprio perfil" on public.profiles
  with check ((select auth.uid()) = id);

alter policy "Usuário só edita o próprio perfil" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------------------
alter policy "Avaliar só quem participou do mesmo evento concluído" on public.ratings
  with check (
    (avaliador_id = (select auth.uid()))
    and exists (
      select 1 from events e where e.id = ratings.event_id and e.status = 'concluido'::event_status
    )
    and exists (
      select 1 from commitments c
      where c.event_id = ratings.event_id and c.user_id = (select auth.uid()) and c.status = 'check-in'::commitment_status
    )
    and exists (
      select 1 from commitments c
      where c.event_id = ratings.event_id and c.user_id = ratings.avaliado_id and c.status = 'check-in'::commitment_status
    )
  );

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
alter policy "Usuário cria denúncia" on public.reports
  with check (denunciante_id = (select auth.uid()));

alter policy "Usuário vê as próprias denúncias; admin vê todas" on public.reports
  using (
    (denunciante_id = (select auth.uid()))
    or exists (select 1 from profiles p where p.id = (select auth.uid()) and p.is_admin)
  );

-- ---------------------------------------------------------------------------
-- function_search_path_mutable
-- ---------------------------------------------------------------------------
create or replace function public.set_friendship_responded_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.status = 'aceito' and old.status = 'pendente' then
    new.respondido_em := now();
  end if;
  return new;
end;
$function$;
