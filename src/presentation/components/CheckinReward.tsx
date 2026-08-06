import { useEffect } from "react";
import { Trophy } from "lucide-react";
import type { CheckinResult } from "../../infrastructure/supabase/repositories/CommitmentsRepository";

/** Toast fixo no rodapé, mostrado logo após um check-in bem-sucedido:
 * quantos pontos de reputação a pessoa ganhou e, se for o caso, quais
 * troféus foram desbloqueados nessa mesma ação. Some sozinho depois de
 * alguns segundos (ou ao tocar fora). */
export function CheckinReward({ result, onDismiss }: { result: CheckinResult; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="reward-toast fixed left-1/2 bottom-24 z-50 w-[calc(100%-2rem)] max-w-sm bg-ink-800 border border-quorum-500/40 rounded-2xl p-4 shadow-xl"
      onClick={onDismiss}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">✓</span>
        <p className="text-sm font-semibold text-ink-100">
          Check-in confirmado —{" "}
          <span className="text-quorum-500">
            {result.pontosGanhos >= 0 ? "+" : ""}
            {result.pontosGanhos} pontos
          </span>{" "}
          de reputação
        </p>
      </div>

      {result.trofeusNovos.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-ink-700 space-y-1.5">
          {result.trofeusNovos.map((trofeu) => (
            <div key={trofeu.id} className="flex items-center gap-2">
              <Trophy size={14} className="text-quorum-500 shrink-0" />
              <p className="text-xs text-ink-300">
                Troféu desbloqueado: <span className="font-semibold text-ink-100">{trofeu.emoji} {trofeu.nome}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
