import type { TrophyProgress } from "../../application/hooks/useTrophies";

function progressLabel(item: TrophyProgress): string | null {
  if (item.conquistado || item.trophy.criterioValor === null) return null;
  if (item.trophy.criterioTipo === "checkins") return `${item.trophy.criterioValor} check-ins`;
  if (item.trophy.criterioTipo === "pontos") return `${item.trophy.criterioValor} pontos`;
  return null;
}

/** Grade de troféus — conquistados em destaque, o resto em cinza como
 * meta a bater (mostrar o que falta é parte da graça da gamificação). */
export function TrophyGrid({ progress }: { progress: TrophyProgress[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {progress.map((item) => (
        <div
          key={item.trophy.id}
          className={`flex flex-col items-center text-center gap-1 rounded-2xl p-3 border ${
            item.conquistado
              ? "bg-quorum-500/10 border-quorum-500/40"
              : "bg-ink-800/40 border-ink-700 opacity-50"
          }`}
        >
          <span className={`text-2xl ${item.conquistado ? "" : "grayscale"}`}>{item.trophy.emoji}</span>
          <p className="text-[11px] font-semibold text-ink-100 leading-tight">{item.trophy.nome}</p>
          {!item.conquistado && (
            <p className="text-[10px] text-ink-500 leading-tight">{progressLabel(item)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
