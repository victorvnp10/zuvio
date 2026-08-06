-- Zuvio — Migração 0031
--
-- `checkin_event` calculava `pontos_ganhos` como a diferença entre o
-- total de pontos depois e antes do check-in. Como `recompute_reliability`
-- nunca deixa o total ficar negativo (`greatest(0, ...)`), alguém que
-- já tinha um no-show no histórico podia fazer um check-in de verdade
-- e ver "+0 pontos" — o ganho real (+10) ficava mascarado pelo piso em
-- zero do total. `pontos_ganhos` agora é sempre a recompensa fixa do
-- check-in (+10, mesmo valor usado em `recompute_reliability`),
-- independente de onde o total (`pontos_totais`) pousa depois do piso.
create or replace function checkin_event(
  p_event_id uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_commitment commitments%rowtype;
  v_distance_meters double precision;
  v_trofeus_antes text[];
  v_pontos_totais integer;
  v_trofeus_novos jsonb;
begin
  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'Evento não encontrado';
  end if;

  if v_event.geo_lat is not null and v_event.geo_lng is not null then
    if p_lat is null or p_lng is null then
      raise exception 'Localização necessária para o check-in deste evento';
    end if;

    v_distance_meters := 6371000 * acos(
      least(1, greatest(-1,
        cos(radians(p_lat)) * cos(radians(v_event.geo_lat)) *
        cos(radians(v_event.geo_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(v_event.geo_lat))
      ))
    );

    if v_distance_meters > 100 then
      raise exception 'Você precisa estar no local do evento para fazer check-in';
    end if;
  end if;

  if now() < v_event.data_hora - interval '30 minutes'
     or now() > v_event.data_hora + interval '180 minutes' then
    raise exception 'Fora da janela de horário do check-in';
  end if;

  select coalesce(array_agg(trophy_id), array[]::text[]) into v_trofeus_antes
  from profile_trophies where profile_id = auth.uid();

  update commitments
  set status = 'check-in', checkin_em = now()
  where event_id = p_event_id and user_id = auth.uid() and status = 'confirmado'
  returning * into v_commitment;

  if v_commitment.id is null then
    raise exception 'Compromisso confirmado não encontrado para este check-in';
  end if;

  select pontos_reputacao into v_pontos_totais from profiles where id = auth.uid();

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'nome', t.nome, 'emoji', t.emoji, 'descricao', t.descricao
         )), '[]'::jsonb)
  into v_trofeus_novos
  from profile_trophies pt
  join trophies t on t.id = pt.trophy_id
  where pt.profile_id = auth.uid() and pt.trophy_id != all(v_trofeus_antes);

  return jsonb_build_object(
    'commitment', to_jsonb(v_commitment),
    'pontos_ganhos', 10,
    'pontos_totais', v_pontos_totais,
    'trofeus_novos', v_trofeus_novos
  );
end;
$$;
