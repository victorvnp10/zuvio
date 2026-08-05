import type { Commitment, TrustBadge } from "../entities/types";

/**
 * Domínio: Score de Confiabilidade.
 *
 * Cálculo simples do MVP (seção 7): % de comparecimento real
 * (check-in) sobre o total de compromissos que já deveriam ter
 * acontecido (exclui os ainda em aberto/futuros). Função pura — não
 * acessa banco, recebe os compromissos já carregados.
 */

const BADGE_THRESHOLDS: { min: number; badge: TrustBadge }[] = [
  { min: 90, badge: "ouro" },
  { min: 75, badge: "prata" },
  { min: 50, badge: "bronze" },
  { min: 0, badge: "nenhum" },
];

const RESOLVED_STATUSES = new Set(["check-in", "no-show", "cancelado"]);

export interface ReliabilityStats {
  totalResolvidos: number;
  totalCheckins: number;
  scoreConfiabilidade: number;
  selo: TrustBadge;
}

export const computeReliability = (commitments: Commitment[]): ReliabilityStats => {
  const resolved = commitments.filter((c) => RESOLVED_STATUSES.has(c.status));
  const checkins = resolved.filter((c) => c.status === "check-in");

  // Sem histórico suficiente ainda: não penaliza nem prêmia — score
  // neutro, sem selo.
  if (resolved.length === 0) {
    return { totalResolvidos: 0, totalCheckins: 0, scoreConfiabilidade: 100, selo: "nenhum" };
  }

  const scoreConfiabilidade = Math.round((checkins.length / resolved.length) * 100);
  const selo = BADGE_THRESHOLDS.find((t) => scoreConfiabilidade >= t.min)!.badge;

  return {
    totalResolvidos: resolved.length,
    totalCheckins: checkins.length,
    scoreConfiabilidade,
    selo,
  };
};
