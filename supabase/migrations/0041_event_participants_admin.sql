-- Zuvio — Migração 0041 (Painel do administrador: roster completo)
--
-- `list_pending_registrations` (migração 0038) só devolve quem está
-- 'pendente' — não serve pra exportar a lista completa de
-- participantes (a maioria já está 'confirmado'/'check-in' quando o
-- organizador for baixar a lista). Esta função devolve TODOS os
-- status de um evento, com nome + e-mail, na mesma lógica de acesso
-- de `list_pending_registrations`: só quem organiza o próprio evento.
--
-- É uma extensão deliberada da mesma exceção já documentada em 0038 —
-- o organizador precisa poder identificar/contatar quem se inscreveu
-- (aprovação, check-in manual, exportar lista de presença), não só
-- durante a fila de aprovação.

create or replace function list_event_participants(p_event_id uuid)
returns table (
  commitment_id uuid,
  user_id uuid,
  nome text,
  foto_url text,
  email text,
  status commitment_status,
  confirmado_em timestamptz,
  checkin_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from events where id = p_event_id and criador_id = auth.uid()) then
    raise exception 'Evento não encontrado';
  end if;

  return query
  select c.id, c.user_id, p.nome, p.foto_url, u.email, c.status, c.confirmado_em, c.checkin_em
  from commitments c
  join profiles p on p.id = c.user_id
  join auth.users u on u.id = c.user_id
  where c.event_id = p_event_id
  order by c.confirmado_em asc;
end;
$$;

grant execute on function list_event_participants(uuid) to authenticated;
revoke execute on function list_event_participants(uuid) from public, anon;
