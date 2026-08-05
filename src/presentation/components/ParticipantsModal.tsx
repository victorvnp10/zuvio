import { useEffect, useState } from "react";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { Avatar } from "./Avatar";
import { X, Crown } from "lucide-react";
import type { Commitment } from "../../domain/entities/types";

function OrganizerRow({ userId }: { userId: string }) {
  const { data: profile } = usePublicProfile(userId);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar fotoUrl={profile?.fotoUrl} nome={profile?.nome} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-100 truncate">{profile?.nome ?? "..."}</p>
        <span className="inline-flex items-center gap-1 text-[11px] text-amber-500">
          <Crown size={11} /> Organizador
        </span>
      </div>
    </div>
  );
}

function ParticipantRow({ userId, status }: { userId: string; status: Commitment["status"] }) {
  const { data: profile } = usePublicProfile(userId);

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar fotoUrl={profile?.fotoUrl} nome={profile?.nome} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink-100 truncate">{profile?.nome ?? "..."}</p>
      </div>
      {status === "check-in" && (
        <span className="text-[11px] font-semibold text-quorum-500 bg-quorum-500/10 px-2 py-0.5 rounded-full">
          Check-in ✓
        </span>
      )}
      {status === "confirmado" && (
        <span className="text-[11px] font-semibold text-ink-400 bg-ink-700/60 px-2 py-0.5 rounded-full">
          Confirmado
        </span>
      )}
    </div>
  );
}

/** Modal de acesso rápido à relação de participantes — aberto a partir
 * de um toque no anel de quórum (no feed OU na tela de detalhe do
 * evento) ou no botão "ver participantes" na tela de detalhe.
 *
 * `commitments` é opcional: quando quem chama já tem a lista carregada
 * (tela de detalhe, via `useEventDetail`), passa direto e evita nova
 * busca; quando não tem (card do feed, que só carrega os IDs dos
 * confirmados, sem status), o modal busca sozinho a partir do
 * `eventId`.
 *
 * O organizador é mostrado à parte, sempre — ele nunca tem uma linha
 * em `commitments` (não passa pelo fluxo de "comprometer-se" no
 * próprio evento, ver ARCHITECTURE.md), então filtrar `commitments`
 * sozinho o deixaria de fora da lista. */
export function ParticipantsModal({
  eventId,
  commitments: commitmentsProp,
  organizadorId,
  onClose,
}: {
  eventId?: string;
  commitments?: Commitment[];
  organizadorId: string;
  onClose: () => void;
}) {
  const [fetched, setFetched] = useState<Commitment[] | null>(null);
  const [isLoading, setIsLoading] = useState(!commitmentsProp && Boolean(eventId));

  useEffect(() => {
    if (commitmentsProp || !eventId) return;
    let isMounted = true;
    setIsLoading(true);
    CommitmentsRepository.listForEvent(eventId)
      .then((data) => {
        if (isMounted) setFetched(data);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [eventId, commitmentsProp]);

  const commitments = commitmentsProp ?? fetched ?? [];
  const active = commitments
    .filter((c) => c.userId !== organizadorId && (c.status === "confirmado" || c.status === "check-in"))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "check-in" ? -1 : 1));

  return (
    <div className="fixed inset-0 bg-ink-950/80 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-ink-800 border border-ink-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-ink-700">
          <h3 className="font-display font-semibold text-lg">
            Participantes {!isLoading && `(${active.length + 1})`}
          </h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 divide-y divide-ink-700/60">
          <OrganizerRow userId={organizadorId} />
          {isLoading && <p className="text-sm text-ink-500 py-6 text-center">Carregando...</p>}
          {!isLoading && active.length === 0 && (
            <p className="text-sm text-ink-500 py-6 text-center">Ninguém mais confirmou ainda.</p>
          )}
          {active.map((c) => (
            <ParticipantRow key={c.id} userId={c.userId} status={c.status} />
          ))}
        </div>
      </div>
    </div>
  );
}
