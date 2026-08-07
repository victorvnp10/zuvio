-- Zuvio — Migração 0042 (Certificados)
--
-- Elegibilidade é CALCULADA, não armazenada (evita mais uma tabela pra
-- manter sincronizada) — `get_certificate_eligibility` devolve, por
-- participante confirmado/check-in, o percentual de presença e se bate
-- o mínimo configurado pelo organizador:
--
--   - Conferência: percentual = (atividades em que a pessoa fez
--     check-in) / (total de atividades da conferência). Sem isso,
--     "presença" numa conferência de vários dias não tem como ser só
--     um sim/não.
--   - Evento comum: só existe "a" presença — check-in = 100%, senão 0%
--     (não faz sentido pedir uma "porcentagem" de um evento que só
--     acontece uma vez).
--
-- `certificado_presenca_minima` é editada direto pelo cliente (mesma
-- policy de UPDATE que já existe pra qualquer campo de `events`, ver
-- 0001) — não precisa de função própria só pra isso.

alter table events add column certificado_presenca_minima int
  check (certificado_presenca_minima between 0 and 100);

create or replace function get_certificate_eligibility(p_event_id uuid)
returns table (
  user_id uuid,
  nome text,
  percentual numeric,
  elegivel boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_total_atividades integer;
begin
  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'Evento não encontrado';
  end if;

  if v_event.criador_id <> auth.uid() then
    raise exception 'Só o organizador pode ver a elegibilidade de certificado';
  end if;

  if v_event.tipo_evento = 'conferencia' then
    select count(*) into v_total_atividades
    from conference_activities where event_id = p_event_id;

    return query
    select
      c.user_id,
      p.nome,
      case when v_total_atividades = 0 then 0::numeric
        else round(100.0 * count(ac.id) / v_total_atividades, 1)
      end,
      case when v_total_atividades = 0 then false
        else (100.0 * count(ac.id) / v_total_atividades) >= coalesce(v_event.certificado_presenca_minima, 100)
      end
    from commitments c
    join profiles p on p.id = c.user_id
    left join conference_activities ca on ca.event_id = p_event_id
    left join activity_checkins ac on ac.activity_id = ca.id and ac.user_id = c.user_id
    where c.event_id = p_event_id and c.status in ('confirmado', 'check-in')
    group by c.user_id, p.nome;
  else
    return query
    select
      c.user_id,
      p.nome,
      (case when c.status = 'check-in' then 100 else 0 end)::numeric,
      c.status = 'check-in'
    from commitments c
    join profiles p on p.id = c.user_id
    where c.event_id = p_event_id and c.status in ('confirmado', 'check-in');
  end if;
end;
$$;

grant execute on function get_certificate_eligibility(uuid) to authenticated;
revoke execute on function get_certificate_eligibility(uuid) from public, anon;
