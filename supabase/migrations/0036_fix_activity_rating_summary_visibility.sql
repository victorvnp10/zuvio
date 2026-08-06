-- Zuvio — Migração 0036
--
-- `get_activity_rating_summary` é SECURITY DEFINER de propósito (pra
-- agregar sobre TODAS as avaliações, não só as que a RLS deixaria o
-- chamador ver) — mas isso também significa que o RLS de
-- `conference_activities`/`events` NÃO se aplica automaticamente
-- dentro dela. Sem checagem própria, qualquer autenticado que
-- adivinhasse/soubesse um UUID de atividade de uma conferência
-- Restrita conseguiria ver a média de estrelas mesmo sem enxergar o
-- evento. Baixa severidade (é só um número agregado, sem PII), mas
-- corrigido mesmo assim — espelha exatamente a política de SELECT de
-- `events` (migração 0013).
create or replace function get_activity_rating_summary(p_activity_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not exists (
    select 1 from conference_activities ca
    join events e on e.id = ca.event_id
    where ca.id = p_activity_id
      and (
        e.modalidade in ('estranhos', 'hibrida')
        or e.criador_id = auth.uid()
        or is_event_participant(e.id, auth.uid())
        or has_redeemed_invite(e.id, auth.uid())
        or (e.modalidade = 'amigos' and are_friends(e.criador_id, auth.uid()))
      )
  ) then
    raise exception 'Atividade não encontrada';
  end if;

  select jsonb_build_object('media', round(avg(nota)::numeric, 2), 'total', count(*))
  into v_result
  from activity_ratings
  where activity_id = p_activity_id;

  return v_result;
end;
$$;
