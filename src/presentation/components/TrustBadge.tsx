import type { TrustBadge } from "../../domain/entities/types";

const CONFIG: Record<TrustBadge, { emoji: string; label: string; className: string } | null> = {
  nenhum: null,
  bronze: { emoji: "🥉", label: "Bronze", className: "bg-amber-500/15 text-amber-500" },
  prata: { emoji: "🥈", label: "Prata", className: "bg-ink-300/15 text-ink-200" },
  ouro: { emoji: "🥇", label: "Ouro", className: "bg-quorum-500/15 text-quorum-500" },
};

export function TrustBadgePill({
  selo,
  scoreConfiabilidade,
  pontosReputacao,
}: {
  selo: TrustBadge;
  scoreConfiabilidade: number;
  pontosReputacao?: number;
}) {
  const config = CONFIG[selo];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        {config && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${config.className}`}>
            {config.emoji} {config.label}
          </span>
        )}
        <span className="text-xs text-ink-400">{scoreConfiabilidade}% de comparecimento</span>
      </div>
      {pontosReputacao !== undefined && (
        <span className="text-xs font-semibold text-quorum-500">{pontosReputacao} pontos de reputação</span>
      )}
    </div>
  );
}
