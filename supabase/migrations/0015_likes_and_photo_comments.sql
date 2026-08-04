-- =============================================================================
-- Zuvio — Migração 0015: curtidas (eventos e fotos) e comentários em fotos
-- =============================================================================

create table event_likes (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table event_likes enable row level security;

create policy "Qualquer autenticado vê as curtidas"
  on event_likes for select
  to authenticated
  using (true);

create policy "Cada um só curte/descurte por si"
  on event_likes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table event_photo_likes (
  photo_id uuid not null references event_photos(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (photo_id, user_id)
);

alter table event_photo_likes enable row level security;

create policy "Quem vê a foto pode ver quem curtiu"
  on event_photo_likes for select
  to authenticated
  using (
    exists (
      select 1 from event_photos p
      where p.id = photo_id
        and (
          p.visibilidade = 'publica'
          or is_event_creator(p.event_id, auth.uid())
          or is_event_participant(p.event_id, auth.uid())
        )
    )
  );

create policy "Cada um só curte/descurte foto por si"
  on event_photo_likes for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from event_photos p
      where p.id = photo_id
        and (
          p.visibilidade = 'publica'
          or is_event_creator(p.event_id, auth.uid())
          or is_event_participant(p.event_id, auth.uid())
        )
    )
  );

create table event_photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references event_photos(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  criado_em timestamptz not null default now()
);

create index event_photo_comments_photo_idx on event_photo_comments (photo_id, criado_em);

alter table event_photo_comments enable row level security;

create policy "Quem vê a foto lê os comentários"
  on event_photo_comments for select
  to authenticated
  using (
    exists (
      select 1 from event_photos p
      where p.id = photo_id
        and (
          p.visibilidade = 'publica'
          or is_event_creator(p.event_id, auth.uid())
          or is_event_participant(p.event_id, auth.uid())
        )
    )
  );

create policy "Quem vê a foto comenta"
  on event_photo_comments for insert
  to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from event_photos p
      where p.id = photo_id
        and (
          p.visibilidade = 'publica'
          or is_event_creator(p.event_id, auth.uid())
          or is_event_participant(p.event_id, auth.uid())
        )
    )
  );

create policy "Autor do comentário ou organizador do evento remove"
  on event_photo_comments for delete
  to authenticated
  using (
    autor_id = auth.uid()
    or exists (
      select 1 from event_photos p
      where p.id = photo_id and is_event_creator(p.event_id, auth.uid())
    )
  );
