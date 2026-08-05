import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useModeration } from "../../application/hooks/useModeration";

export function ReportMenu({ eventId, criadorId }: { eventId: string; criadorId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "sent">("menu");
  const [motivo, setMotivo] = useState("");
  const { reportUser, blockUser, isSubmitting } = useModeration();

  const close = () => {
    setIsOpen(false);
    setMode("menu");
    setMotivo("");
  };

  const handleReport = async () => {
    if (!motivo.trim()) return;
    await reportUser(motivo, { denunciadoId: criadorId, eventId });
    setMode("sent");
  };

  const handleBlock = async () => {
    await blockUser(criadorId);
    close();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="p-2 text-ink-300 hover:text-ink-100"
        aria-label="Mais opções"
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-ink-800 border border-ink-700 rounded-2xl shadow-2xl z-30 p-3 space-y-2">
          {mode === "menu" && (
            <>
              <button
                onClick={() => setMode("report")}
                className="w-full text-left text-sm text-ink-200 hover:bg-ink-700/50 rounded-lg px-3 py-2"
              >
                Denunciar evento/organizador
              </button>
              <button
                onClick={handleBlock}
                disabled={isSubmitting}
                className="w-full text-left text-sm text-red-400 hover:bg-ink-700/50 rounded-lg px-3 py-2"
              >
                Bloquear organizador
              </button>
              <button
                onClick={close}
                className="w-full text-left text-sm text-ink-500 hover:bg-ink-700/50 rounded-lg px-3 py-2"
              >
                Cancelar
              </button>
            </>
          )}

          {mode === "report" && (
            <>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva o motivo da denúncia..."
                rows={3}
                className="w-full bg-ink-900 border border-ink-700 rounded-lg p-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none resize-none"
              />
              <button
                onClick={handleReport}
                disabled={isSubmitting || !motivo.trim()}
                className="w-full bg-red-500 disabled:opacity-40 text-ink-950 font-semibold py-2 rounded-lg text-sm"
              >
                Enviar denúncia
              </button>
            </>
          )}

          {mode === "sent" && (
            <>
              <p className="text-sm text-quorum-500 px-1 py-2">
                Denúncia enviada — nossa equipe vai analisar.
              </p>
              <button
                onClick={close}
                className="w-full text-sm text-ink-400 hover:bg-ink-700/50 rounded-lg px-3 py-2"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
