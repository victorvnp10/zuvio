import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, XCircle, Trash2 } from "lucide-react";
import { AppShell } from "../layout/AppShell";
import { useMyEvents } from "../../application/hooks/useMyEvents";
import { useManageMyEvent } from "../../application/hooks/useManageMyEvent";
import { useHistory, type HistoryEntry } from "../../application/hooks/useHistory";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { QuorumBar } from "../components/QuorumMeter";
import { categoryGradientStyle } from "../components/CategoryBadge";
import { useCategories, findCategory } from "../../application/hooks/useCategories";
import { getCountdownLabel, isUrgent } from "../../domain/valueObjects/EventTiming";
import type { EventProposal } from "../../domain/entities/types";

/** Espelha os pontos de `recompute_reliability` (migração 0030) — só
 * pra rotular a linha do histórico; o total oficial vive em
 * `profile.pontosReputacao`, calculado no banco. */
const STATUS_DISPLAY: Record<string, { label: string; pontos: number; className: string }> = {
  "check-in": { label: "Compareceu", pontos: 10, className: "text-quorum-500" },
  "no-show": { label: "Não compareceu", pontos: -15, className: "text-red-400" },
  cancelado: { label: "Cancelado", pontos: -5, className: "text-ink-400" },
};

function HistoryRow({ entry, onOpen }: { entry: HistoryEntry; onOpen: () => void }) {
  const { data: categories } = useCategories();
  const categoria = findCategory(categories, entry.event.categoria);
  const display = STATUS_DISPLAY[entry.commitment.status] ?? { label: entry.commitment.status, pontos: 0, className: "text-ink-400" };

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 bg-ink-800/40 border border-ink-700 rounded-xl p-3 text-left"
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: categoria.cor }}
      >
        {categoria.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-100 truncate">{entry.event.titulo}</p>
        <p className="text-[11px] text-ink-500">
          {format(new Date(entry.event.dataHora), "dd/MM/yyyy", { locale: ptBR })}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-semibold ${display.className}`}>{display.label}</p>
        <p className={`text-[11px] ${display.className}`}>
          {display.pontos >= 0 ? "+" : ""}
          {display.pontos} pontos
        </p>
      </div>
    </button>
  );
}

function EventCard({
  event,
  onOpen,
  onEdit,
  onCancel,
  onDelete,
  canManage,
}: {
  event: EventProposal;
  onOpen: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  canManage?: boolean;
}) {
  const { data: categories } = useCategories();
  const categoria = findCategory(categories, event.categoria);
  const quorum = summarizeQuorum(event);
  const isCancelled = event.status === "cancelado";
  // Antes do quórum ser atingido, ninguém "de fora" depende do evento
  // como um compromisso firmado — dá para excluir de verdade. Depois
  // disso, só cancelar (mantém o histórico para quem já confirmou).
  const canHardDelete = event.status === "aberto";
  const now = new Date().toISOString();
  const countdown = getCountdownLabel(event.dataHora, now);
  const urgent = isUrgent(event.dataHora, now);

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-3xl overflow-hidden">
      <button onClick={onOpen} className="w-full text-left">
        <div
          className={`relative h-24 flex items-center justify-center ${isCancelled ? "grayscale opacity-60" : ""}`}
          style={
            event.capaUrl
              ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : categoryGradientStyle(categoria.cor)
          }
        >
          {!event.capaUrl && (
            <span className="category-icon-float text-3xl opacity-90">{categoria.emoji}</span>
          )}

          {/* Selos flutuantes — mesmo conceito do feed/detalhe, só que
              compactos (sem faixa perfurada, sem confete: é uma lista
              de gestão, não o cartão de "convite"). */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 bg-ink-950/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoria.cor }} />
              {categoria.nome}
            </span>
            {isCancelled ? (
              <span className="text-[10px] font-semibold bg-ink-900/80 text-red-400 px-2 py-0.5 rounded-full">
                Cancelado
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                  quorum.quorumAtingido
                    ? "bg-quorum-500 text-ink-950"
                    : urgent
                    ? "bg-coral-500 text-ink-950"
                    : "bg-ink-950/60 backdrop-blur-sm text-ink-100"
                }`}
              >
                {quorum.quorumAtingido ? "CONFIRMADO 🔓" : countdown}
              </span>
            )}
          </div>
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
          {canHardDelete ? (
            <button
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-red-400 hover:bg-ink-700/50 transition-colors"
            >
              <Trash2 size={14} /> Excluir
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-red-400 hover:bg-ink-700/50 transition-colors"
            >
              <XCircle size={14} /> Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MyEventsScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useMyEvents();
  const { data: history } = useHistory();
  const { cancelEvent, deleteEvent, isSubmitting } = useManageMyEvent();
  const [pendingAction, setPendingAction] = useState<{ id: string; type: "cancel" | "delete" } | null>(
    null
  );

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
                  onCancel={() => setPendingAction({ id: event.id, type: "cancel" })}
                  onDelete={() => setPendingAction({ id: event.id, type: "delete" })}
                />
              ))}
            </div>
          </section>

          {data && data.pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-ink-400 mb-2 uppercase tracking-wide">
                Aguardando aprovação
              </h2>
              <div className="space-y-4">
                {data.pending.map((event) => (
                  <EventCard key={event.id} event={event} onOpen={() => navigate(`/eventos/${event.id}`)} />
                ))}
              </div>
            </section>
          )}

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

          {history && history.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-ink-400 mb-2 uppercase tracking-wide">
                Histórico
              </h2>
              <div className="space-y-2">
                {history.map((entry) => (
                  <HistoryRow
                    key={entry.commitment.id}
                    entry={entry}
                    onOpen={() => navigate(`/eventos/${entry.event.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

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
