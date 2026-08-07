import { Check, X } from "lucide-react";
import { usePendingRegistrations } from "../../application/hooks/usePendingRegistrations";
import { Avatar } from "./Avatar";

/** Fila de aprovação do organizador — só aparece quando existe pelo
 * menos uma inscrição pendente. Nome + e-mail vêm de
 * `list_pending_registrations()` (migração 0038), a única leitura do
 * app que expõe e-mail, restrita a quem organiza o próprio evento. */
export function PendingRegistrationsSection({ eventId }: { eventId: string }) {
  const { pending, isLoading, actingId, error, approve, reject } = usePendingRegistrations(eventId);

  if (isLoading || pending.length === 0) return null;

  return (
    <div className="bg-ink-800/60 border border-amber-500/30 rounded-2xl p-5 space-y-3">
      <h3 className="font-display font-semibold text-amber-500">
        Inscrições pendentes <span className="text-ink-400 font-normal">({pending.length})</span>
      </h3>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {pending.map((reg) => (
          <div
            key={reg.commitmentId}
            className="flex items-center gap-3 bg-ink-900/40 border border-ink-700 rounded-xl p-3"
          >
            <Avatar fotoUrl={reg.fotoUrl} nome={reg.nome} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-100 truncate">{reg.nome}</p>
              <p className="text-xs text-ink-500 truncate">{reg.email}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => reject(reg.commitmentId)}
                disabled={actingId === reg.commitmentId}
                className="p-2 rounded-full bg-ink-700 text-red-400 disabled:opacity-40"
                aria-label={`Rejeitar inscrição de ${reg.nome}`}
              >
                <X size={16} />
              </button>
              <button
                onClick={() => approve(reg.commitmentId)}
                disabled={actingId === reg.commitmentId}
                className="p-2 rounded-full bg-quorum-500/15 text-quorum-500 disabled:opacity-40"
                aria-label={`Aprovar inscrição de ${reg.nome}`}
              >
                <Check size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
