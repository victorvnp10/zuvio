import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, XCircle } from "lucide-react";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../../application/context/AuthContext";
import { useMyEvents } from "../../application/hooks/useMyEvents";
import { useManageMyEvent } from "../../application/hooks/useManageMyEvent";
import { useHistory } from "../../application/hooks/useHistory";
import { useQuickCommit } from "../../application/hooks/useQuickCommit";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { EventLikesRepository } from "../../infrastructure/supabase/repositories/EventLikesRepository";
import { EventPhotosRepository } from "../../infrastructure/supabase/repositories/EventPhotosRepository";
import { EventPostCard } from "../components/EventPostCard";
import { HistoryTicketCard } from "../components/HistoryTicketCard";
import type { EventProposal } from "../../domain/entities/types";

/** Editar/cancelar/excluir — ações de gestão que o ingresso do feed não
 * tem (ali quem organiza só vê "Seu evento" desabilitado). Fica como
 * uma tira própria, fora do cartão, igual as ações sociais do feed. */
function ManageRow({
  event,
  onEdit,
  onCancel,
  onDelete,
}: {
  event: EventProposal;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const isCancelled = event.status === "cancelado";
  if (isCancelled) return null;
  const canHardDelete = event.status === "aberto";

  return (
    <div className="flex gap-2 mt-2 px-1">
      <button
        onClick={onEdit}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-ink-300 bg-ink-800/60 border border-ink-700 rounded-lg"
      >
        <Pencil size={13} /> Editar
      </button>
      {canHardDelete ? (
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-400 bg-ink-800/60 border border-ink-700 rounded-lg"
        >
          <Trash2 size={13} /> Excluir
        </button>
      ) : (
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-400 bg-ink-800/60 border border-ink-700 rounded-lg"
        >
          <XCircle size={13} /> Cancelar
        </button>
      )}
    </div>
  );
}

export function MyEventsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useMyEvents();
  const { data: history } = useHistory();
  const { cancelEvent, deleteEvent, isSubmitting } = useManageMyEvent();
  const { commit, cancel: quickCancel, pendingEventId } = useQuickCommit();
  const [pendingAction, setPendingAction] = useState<{ id: string; type: "cancel" | "delete" } | null>(
    null
  );

  // Mesma composição de dados do feed (participantes/curtidas/fotos em
  // lote) — é o mesmo ingresso, então precisa dos mesmos ingredientes.
  const allEvents = useMemo(
    () => [...(data?.created ?? []), ...(data?.pending ?? []), ...(data?.committed ?? [])],
    [data]
  );
  const eventIds = useMemo(() => allEvents.map((e) => e.id), [allEvents]);

  const { data: allParticipants } = useQuery({
    queryKey: ["my-events-participants", eventIds],
    queryFn: () => CommitmentsRepository.listForEvents(eventIds),
    enabled: eventIds.length > 0,
  });

  const { data: allLikes } = useQuery({
    queryKey: ["my-events-likes", eventIds],
    queryFn: () => EventLikesRepository.listForEvents(eventIds),
    enabled: eventIds.length > 0,
  });

  const publicPhotoEventIds = useMemo(
    () => allEvents.filter((e) => e.fotosPublicas).map((e) => e.id),
    [allEvents]
  );

  const { data: photosByEvent } = useQuery({
    queryKey: ["my-events-photos", publicPhotoEventIds],
    queryFn: () => EventPhotosRepository.listForEvents(publicPhotoEventIds),
    enabled: publicPhotoEventIds.length > 0,
  });

  const participantsByEvent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of allParticipants ?? []) {
      map.set(c.eventId, [...(map.get(c.eventId) ?? []), c.userId]);
    }
    return map;
  }, [allParticipants]);

  const likesByEvent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const l of allLikes ?? []) {
      map.set(l.eventId, [...(map.get(l.eventId) ?? []), l.userId]);
    }
    return map;
  }, [allLikes]);

  const handleConfirm = async () => {
    if (!pendingAction) return;
    const ok =
      pendingAction.type === "delete"
        ? await deleteEvent(pendingAction.id)
        : await cancelEvent(pendingAction.id);
    setPendingAction(null);
    if (ok) {
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    }
  };

  if (isLoading || !user) {
    return (
      <AppShell title="Meus Eventos">
        <p className="text-ink-400">Carregando...</p>
      </AppShell>
    );
  }

  const renderCard = (
    event: EventProposal,
    opts: { isOwnEvent?: boolean; isCommitted?: boolean; isPendingApproval?: boolean }
  ) => (
    <EventPostCard
      key={event.id}
      event={event}
      participantIds={participantsByEvent.get(event.id) ?? []}
      likerIds={likesByEvent.get(event.id) ?? []}
      photos={photosByEvent?.[event.id] ?? []}
      currentUserId={user.id}
      isOwnEvent={opts.isOwnEvent ?? false}
      isCommitted={opts.isCommitted ?? false}
      isPendingApproval={opts.isPendingApproval ?? false}
      isPending={pendingEventId === event.id}
      onQuickCommit={() => commit(event.id)}
      onQuickCancel={() => quickCancel(event.id)}
    />
  );

  return (
    <AppShell title="Meus Eventos">
      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-ink-400 mb-3 uppercase tracking-wide">
            Criados por mim
          </h2>
          {data?.created.length === 0 && (
            <p className="text-sm text-ink-500">Você ainda não criou nenhuma proposta.</p>
          )}
          <div className="space-y-6">
            {data?.created.map((event) => (
              <div key={event.id}>
                {renderCard(event, { isOwnEvent: true })}
                <ManageRow
                  event={event}
                  onEdit={() => navigate(`/eventos/${event.id}/editar`)}
                  onCancel={() => setPendingAction({ id: event.id, type: "cancel" })}
                  onDelete={() => setPendingAction({ id: event.id, type: "delete" })}
                />
              </div>
            ))}
          </div>
        </section>

        {data && data.pending.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-ink-400 mb-3 uppercase tracking-wide">
              Aguardando aprovação
            </h2>
            <div className="space-y-6">
              {data.pending.map((event) => renderCard(event, { isPendingApproval: true }))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-ink-400 mb-3 uppercase tracking-wide">
            Confirmados
          </h2>
          {data?.committed.length === 0 && (
            <p className="text-sm text-ink-500">Nenhum compromisso confirmado ainda.</p>
          )}
          <div className="space-y-6">
            {data?.committed.map((event) => renderCard(event, { isCommitted: true }))}
          </div>
        </section>

        {history && history.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-ink-400 mb-3 uppercase tracking-wide">
              Histórico
            </h2>
            <div className="space-y-6">
              {history.map((entry) => (
                <HistoryTicketCard
                  key={entry.commitment.id}
                  entry={entry}
                  onOpen={() => navigate(`/eventos/${entry.event.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {pendingAction && (
        <div className="fixed inset-0 bg-ink-950/80 flex items-center justify-center p-4 z-50">
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-display font-semibold text-lg">
              {pendingAction.type === "delete" ? "Excluir esta proposta?" : "Cancelar esta proposta?"}
            </h3>
            <p className="text-sm text-ink-400">
              {pendingAction.type === "delete"
                ? "O quórum ainda não foi atingido — a proposta será apagada de vez, sem deixar rastro."
                : "Quem já confirmou presença vai ver que o evento foi cancelado. Essa ação não pode ser desfeita."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 border border-ink-600 text-ink-300 font-semibold py-2.5 rounded-xl text-sm"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 bg-red-500 disabled:opacity-50 text-ink-950 font-semibold py-2.5 rounded-xl text-sm"
              >
                {isSubmitting ? "Aguarde..." : pendingAction.type === "delete" ? "Sim, excluir" : "Sim, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
