-- Zuvio — Migração 0040 (Painel do administrador: check-in manual)
--
-- Organizador confirma presença de quem esqueceu de fazer o próprio
-- check-in — mesmo efeito de `checkin_event` (status vira 'check-in',
-- pontos de reputação e troféus recalculados), só que:
--   - sem geofence/janela de horário (é o organizador confirmando
--     pessoalmente, não a pessoa se autodeclarando presente);
--   - o alvo é `p_user_id` (escolhido pelo organizador), não
--     `auth.uid()`;
--   - só quem organiza o evento pode chamar.

create or replace function admin_checkin(p_event_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_commitment commitments%rowtype;
  v_trofeus_antes text[];
  v_pontos_antes integer;
  v_pontos_depois integer;
  v_trofeus_novos jsonb;
begin
  select * into v_event from events where id = p_event_id;
  if v_event.id is null then
    raise exception 'Evento não encontrado';
  end if;

  if v_event.criador_id <> auth.uid() then
    raise exception 'Só o organizador pode fazer check-in manual';
  end if;

  select coalesce(array_agg(trophy_id), array[]::text[]) into v_trofeus_antes
  from profile_trophies where profile_id = p_user_id;
  select pontos_reputacao into v_pontos_antes from profiles where id = p_user_id;

  update commitments
  set status = 'check-in', checkin_em = now()
  where event_id = p_event_id and user_id = p_user_id and status = 'confirmado'
  returning * into v_commitment;

  if v_commitment.id is null then
    raise exception 'Compromisso confirmado não encontrado para este check-in';
  end if;

  -- O UPDATE acima disparou `commitments_status_change`, que já
  -- recalculou pontos/selo/troféus síncronamente (mesmo trigger de
  -- `checkin_event`) — os SELECTs abaixo já leem os valores
  -- pós-recálculo.
  select pontos_reputacao into v_pontos_depois from profiles where id = p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'nome', t.nome, 'emoji', t.emoji, 'descricao', t.descricao
         )), '[]'::jsonb)
  into v_trofeus_novos
  from profile_trophies pt
  join trophies t on t.id = pt.trophy_id
  where pt.profile_id = p_user_id and pt.trophy_id != all(v_trofeus_antes);

  return jsonb_build_object(
    'commitment', to_jsonb(v_commitment),
    'pontos_ganhos', coalesce(v_pontos_depois, 0) - coalesce(v_pontos_antes, 0),
    'pontos_totais', v_pontos_depois,
    'trofeus_novos', v_trofeus_novos
  );
end;
$$;

grant execute on function admin_checkin(uuid, uuid) to authenticated;
revoke execute on function admin_checkin(uuid, uuid) from public, anon;
