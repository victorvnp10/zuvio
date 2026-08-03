-- =============================================================================
-- Zuvio — Migração 0006: tipos de evento (Livre / Pago / Colaborativo)
-- =============================================================================

create type tipo_evento as enum ('livre', 'pago', 'colaborativo');
create type modo_lista_colaborativa as enum ('predefinida', 'livre', 'mista');
create type modo_custo_colaborativo as enum ('nenhum', 'valor_fixo_por_pessoa', 'rateio_entre_presentes');

alter table events
  add column tipo_evento tipo_evento not null default 'livre',
  add column valor_entrada numeric(10, 2),
  add column link_pagamento text,
  add column modo_lista_colaborativa modo_lista_colaborativa,
  add column modo_custo_colaborativo modo_custo_colaborativo,
  add column valor_por_pessoa numeric(10, 2),
  add column valor_total_rateio numeric(10, 2);

alter table events add constraint pago_tem_valor_e_link check (
  tipo_evento <> 'pago' or (valor_entrada is not null and valor_entrada > 0 and link_pagamento is not null)
);

alter table events add constraint colaborativo_custo_valido check (
  tipo_evento <> 'colaborativo'
  or modo_custo_colaborativo is null
  or modo_custo_colaborativo = 'nenhum'
  or (modo_custo_colaborativo = 'valor_fixo_por_pessoa' and valor_por_pessoa is not null and valor_por_pessoa > 0)
  or (modo_custo_colaborativo = 'rateio_entre_presentes' and valor_total_rateio is not null and valor_total_rateio > 0)
);

-- Autoconfirmação de pagamento (tipo "pago") — autodeclarado por quem
-- confirmou presença, depois de usar o link de pagamento. O app não
-- processa pagamento nenhum, só guarda essa confirmação para o
-- organizador conferir na entrada.
alter table commitments add column pagamento_confirmado boolean not null default false;

-- -----------------------------------------------------------------------------
-- Lista colaborativa ("o que levar")
-- -----------------------------------------------------------------------------
create table collaborative_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  criado_por uuid not null references profiles(id) on delete cascade,
  reservado_por uuid references profiles(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index collaborative_items_event_idx on collaborative_items (event_id);

alter table collaborative_items enable row level security;

-- Só participantes confirmados (ou o criador) veem a lista — usa as
-- mesmas funções security-definer já existentes (`is_event_creator`,
-- `is_event_participant`), sem risco de recursão.
create policy "Participantes veem a lista colaborativa"
  on collaborative_items for select
  to authenticated
  using (is_event_creator(event_id, auth.uid()) or is_event_participant(event_id, auth.uid()));

-- Adicionar item: o criador do evento sempre pode (lista predefinida);
-- um participante confirmado só pode se o evento aceitar item livre
-- (modo "livre" ou "mista").
create policy "Adicionar item na lista colaborativa"
  on collaborative_items for insert
  to authenticated
  with check (
    criado_por = auth.uid()
    and (
      is_event_creator(event_id, auth.uid())
      or (
        is_event_participant(event_id, auth.uid())
        and exists (
          select 1 from events e
          where e.id = event_id
            and e.modo_lista_colaborativa in ('livre', 'mista')
        )
      )
    )
  );

-- "Marcar que vou levar": qualquer participante confirmado pode
-- reservar um item ainda livre, ou liberar o que reservou.
create policy "Reservar ou liberar um item"
  on collaborative_items for update
  to authenticated
  using (is_event_participant(event_id, auth.uid()) or is_event_creator(event_id, auth.uid()))
  with check (reservado_por = auth.uid() or reservado_por is null);

-- Quem sugeriu o item (ou o criador do evento) pode removê-lo.
create policy "Remover item que eu criei (ou sou o organizador)"
  on collaborative_items for delete
  to authenticated
  using (criado_por = auth.uid() or is_event_creator(event_id, auth.uid()));

-- Autoconfirmação de pagamento (evento tipo "pago") — `commitments` não
-- tem policy de UPDATE direta para o cliente (só via as funções RPC
-- já existentes), então isso também precisa ser uma função.
create or replace function confirm_payment(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update commitments
  set pagamento_confirmado = true
  where event_id = p_event_id and user_id = auth.uid() and status <> 'cancelado';

  if not found then
    raise exception 'Compromisso não encontrado para confirmar pagamento';
  end if;
end;
$$;
