-- =============================================================================
-- Zuvio — Migração 0004: edição completa do evento
-- =============================================================================
-- Antes, só título/descrição/local/data podiam ser editados depois de
-- criado. Agora vagas, quórum, categoria e modalidade também podem —
-- as constraints já existentes (`quorum_within_vagas`,
-- `vagas_within_total`) continuam protegendo contra estados inválidos
-- (não dá pra reduzir vagas abaixo do que já foi confirmado, nem pôr
-- quórum maior que o total de vagas).
--
-- O que faltava: recalcular `status` automaticamente quando
-- `vagas_total`/`quorum_minimo` mudam — sem isso, editar o quórum para
-- baixo do que já está confirmado não liberaria o chat sozinho.
-- =============================================================================

create or replace function recompute_event_status_on_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Eventos cancelados ou já concluídos não voltam a mudar de status
  -- por causa de uma edição de vagas/quórum.
  if new.status in ('cancelado', 'concluido') then
    return new;
  end if;

  if new.vagas_confirmadas >= new.vagas_total then
    new.status := 'fechado';
  elsif new.vagas_confirmadas >= new.quorum_minimo then
    new.status := 'quorum_atingido';
  else
    new.status := 'aberto';
  end if;

  return new;
end;
$$;

create trigger events_recompute_status_on_edit
  before update of vagas_total, quorum_minimo on events
  for each row
  execute function recompute_event_status_on_edit();
