import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, XCircle } from "lucide-react";
import { AppShell } from "../layout/AppShell";
import { useMyEvents } from "../../application/hooks/useMyEvents";
import { useManageMyEvent } from "../../application/hooks/useManageMyEvent";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { QuorumBar } from "../components/QuorumMeter";
import { CategoryBadge, CATEGORY_COVER } from "../components/CategoryBadge";
import type { EventProposal } from "../../domain/entities/types";

function EventCard({
  event,
  onOpen,
  onEdit,
  onCancel,
  canManage,
}: {
  event: EventProposal;
  onOpen: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  canManage?: boolean;
}) {
  const quorum = summarizeQuorum(event);
  const cover = CATEGORY_COVER[event.categoria];
  const isCancelled = event.status === "cancelado";

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-3xl overflow-hidden">
      <button onClick={onOpen} className="w-full text-left">
        <div
          className={`relative h-24 flex items-center justify-center ${isCancelled ? "grayscale opacity-60" : ""} ${
            event.capaUrl ? "" : `bg-gradient-to-br ${cover.gradient}`
          }`}
          style={
            event.capaUrl
              ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {!event.capaUrl && <span className="text-3xl opacity-90">{cover.emoji}</span>}
          <div className="absolute top-2 left-2">
            <CategoryBadge categoria={event.categoria} />
          </div>
          {isCancelled && (
            <span className="absolute top-2 right-2 text-xs font-semibold bg-ink-900/80 text-red-400 px-2 py-0.5 rounded-full">
              Cancelado
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-ink-100">{event.titulo}</h3>
          <p className="text-xs text-ink-400">
            {format(new Date(event.dataHora), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </p>
          {!isCancelled && <QuorumBar quorum={quorum} />}
        </div>
      </button>

      {canManage && !isCancelled && (
        <div className="flex border-t border-ink-700">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-ink-300 hover:bg-ink-700/50 transition-colors"
          >
            <Pencil size={14} /> Editar
          </button>
          <div className="w-px bg-ink-700" />
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-red-400 hover:bg-ink-700/50 transition-colors"
          >
            <XCircle size={14} /> Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

export function MyEventsScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useMyEvents();
  const { cancelEvent, isSubmitting } = useManageMyEvent();
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  const handleConfirmCancel = async () => {
    if (!pendingCancelId) return;
    const ok = await cancelEvent(pendingCancelId);
    setPendingCancelId(null);
    if (ok) {
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
    }
  };

  return (
    <AppShell title="Meus Eventos">
      {isLoading && <p className="text-ink-400">Carregando...</p>}

      {!isLoading && (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-ink-400 mb-2 uppercase tracking-wide">
              Criados por mim
            </h2>
            {data?.created.length === 0 && (
              <p className="text-sm text-ink-500">Você ainda não criou nenhuma proposta.</p>
            )}
            <div className="space-y-4">
              {data?.created.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  canManage
                  onOpen={() => navigate(`/eventos/${event.id}`)}
                  onEdit={() => navigate(`/eventos/${event.id}/editar`)}
                  onCancel={() => setPendingCancelId(event.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-ink-400 mb-2 uppercase tracking-wide">
              Confirmados
            </h2>
            {data?.committed.length === 0 && (
              <p className="text-sm text-ink-500">Nenhum compromisso confirmado ainda.</p>
            )}
            <div className="space-y-4">
              {data?.committed.map((event) => (
                <EventCard key={event.id} event={event} onOpen={() => navigate(`/eventos/${event.id}`)} />
              ))}
            </div>
          </section>
        </div>
      )}

      {pendingCancelId && (
        <div className="fixed inset-0 bg-ink-950/80 flex items-center justify-center p-4 z-50">
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-display font-semibold text-lg">Cancelar esta proposta?</h3>
            <p className="text-sm text-ink-400">
              Quem já confirmou presença vai ver que o evento foi cancelado. Essa ação não
              pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingCancelId(null)}
                className="flex-1 border border-ink-600 text-ink-300 font-semibold py-2.5 rounded-xl text-sm"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isSubmitting}
                className="flex-1 bg-red-500 disabled:opacity-50 text-ink-950 font-semibold py-2.5 rounded-xl text-sm"
              >
                {isSubmitting ? "Cancelando..." : "Sim, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
