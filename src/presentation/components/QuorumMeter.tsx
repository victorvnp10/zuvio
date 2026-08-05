import type { QuorumSummary } from "../../domain/services/QuorumService";

/**
 * O elemento de assinatura do Zuvio (ver seção 14.2 do briefing): um
 * anel de progresso mostrando quantas confirmações reais já existem em
 * relação ao quórum mínimo. Nenhum concorrente citado no mapa
 * competitivo tem esse indicador — é o momento visual mais importante
 * da interface, por isso usa a cor `quorum` (`--color-quorum-500`),
 * reservada exclusivamente para este estado em todo o app.
 */
export function QuorumMeter({
  quorum,
  size = 64,
}: {
  quorum: QuorumSummary;
  size?: number;
}) {
  const strokeWidth = size * 0.11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - quorum.progresso);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink-700)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={quorum.quorumAtingido ? "var(--color-quorum-500)" : "var(--color-coral-500)"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center leading-none">
        <span className="font-display font-semibold text-ink-100" style={{ fontSize: size * 0.22 }}>
          {quorum.vagasConfirmadas}/{quorum.quorumMinimo}
        </span>
      </div>
    </div>
  );
}

/** Variante compacta em barra, para cards de lista (feed de descoberta). */
export function QuorumBar({ quorum }: { quorum: QuorumSummary }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-ink-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${quorum.progresso * 100}%`,
            backgroundColor: quorum.quorumAtingido
              ? "var(--color-quorum-500)"
              : "var(--color-coral-500)",
          }}
        />
      </div>
      <span
        className={`text-xs font-semibold whitespace-nowrap ${
          quorum.quorumAtingido ? "text-quorum-500" : "text-ink-400"
        }`}
      >
        {quorum.vagasConfirmadas}/{quorum.vagasTotal}{" "}
        {quorum.quorumAtingido ? "· 🔓 liberado" : `· quórum ${quorum.quorumMinimo}`}
      </span>
    </div>
  );
}
