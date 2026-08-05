/**
 * Domínio: Proximidade social no feed de descoberta.
 *
 * Eventos de amigos aparecem primeiro, depois eventos onde algum amigo
 * já confirmou presença, depois o restante — sem isso, o feed de
 * descoberta não tem nenhum critério além da data. A privacidade do
 * evento continua sendo decidida antes disso, na política de RLS
 * (quem não pode ver um evento Restrito/Amigos nem chega a receber a
 * linha do banco) — esta pontuação só ordena o que a pessoa já tem
 * permissão de ver.
 */

export const SOCIAL_PROXIMITY = {
  CRIADOR_AMIGO: 3,
  PARTICIPANTE_AMIGO: 2,
  SEM_CONEXAO: 1,
} as const;

export const computeSocialProximityScore = ({
  criadorId,
  participantIds,
  friendIds,
}: {
  criadorId: string;
  participantIds: string[];
  friendIds: Set<string>;
}): number => {
  if (friendIds.has(criadorId)) return SOCIAL_PROXIMITY.CRIADOR_AMIGO;
  if (participantIds.some((id) => friendIds.has(id))) return SOCIAL_PROXIMITY.PARTICIPANTE_AMIGO;
  return SOCIAL_PROXIMITY.SEM_CONEXAO;
};
