import type { EventProposal, EventStatus } from "../entities/types";

/**
 * Domínio: Quórum e ciclo de vida da proposta.
 *
 * Esta é a mecânica de assinatura do Zuvio (ver seção 6.1 e 14.2 do
 * briefing): o chat libera quando o QUÓRUM mínimo é atingido — não
 * quando as vagas se esgotam. Isolar essa decisão aqui, longe de
 * qualquer código de UI ou de acesso a dados, é o que permite testá-la
 * isoladamente e reaproveitá-la tanto no cliente (feedback otimista)
 * quanto num trigger de banco (fonte da verdade real).
 */

export interface QuorumSummary {
  vagasConfirmadas: number;
  vagasTotal: number;
  quorumMinimo: number;
  /** 0 a 1 — para alimentar o medidor visual de quórum. */
  progresso: number;
  quorumAtingido: boolean;
  vagasEsgotadas: boolean;
  vagasRestantes: number;
}

export const summarizeQuorum = (
  event: Pick<EventProposal, "vagasConfirmadas" | "vagasTotal" | "quorumMinimo">
): QuorumSummary => {
  const { vagasConfirmadas, vagasTotal, quorumMinimo } = event;

  return {
    vagasConfirmadas,
    vagasTotal,
    quorumMinimo,
    progresso: Math.min(1, vagasConfirmadas / quorumMinimo),
    quorumAtingido: vagasConfirmadas >= quorumMinimo,
    vagasEsgotadas: vagasConfirmadas >= vagasTotal,
    vagasRestantes: Math.max(0, vagasTotal - vagasConfirmadas),
  };
};

/**
 * Decide o próximo status da proposta a partir do número de
 * confirmações — usado tanto no cliente (otimista) quanto espelhado no
 * trigger SQL `recompute_event_status` (fonte da verdade real).
 *
 * Não decide os estados `concluido` (depende da data) nem `cancelado`
 * (ação explícita do criador/moderação) — esses são transições
 * externas a esta regra.
 */
export const nextStatusAfterCommitmentChange = (
  event: Pick<EventProposal, "vagasConfirmadas" | "vagasTotal" | "quorumMinimo" | "status">
): EventStatus => {
  if (event.status === "cancelado" || event.status === "concluido") {
    return event.status;
  }

  const { quorumAtingido, vagasEsgotadas } = summarizeQuorum(event);

  if (vagasEsgotadas) return "fechado";
  if (quorumAtingido) return "quorum_atingido";
  return "aberto";
};

/** Regra de validação: quórum nunca pode exceder o total de vagas. */
export const isValidQuorum = (quorumMinimo: number, vagasTotal: number): boolean =>
  quorumMinimo >= 1 && quorumMinimo <= vagasTotal;

/**
 * Regra de validação: ao editar as vagas de um evento já existente,
 * nunca dá pra reduzir abaixo de quem já confirmou presença — o banco
 * também protege isso via constraint (`vagas_within_total`), esta é só
 * a checagem otimista no cliente antes de gastar a chamada de rede.
 */
export const canReduceVagasTo = (novoTotal: number, vagasConfirmadas: number): boolean =>
  novoTotal >= vagasConfirmadas;

/** Um evento aceita novas confirmações enquanto não estiver fechado/cancelado/concluído. */
export const acceptsNewCommitments = (status: EventStatus): boolean =>
  status === "aberto" || status === "quorum_atingido";

/** O chat só existe (e só é visível) a partir do momento em que o quórum é atingido. */
export const isChatUnlocked = (status: EventStatus): boolean =>
  status === "quorum_atingido" || status === "fechado" || status === "concluido";
