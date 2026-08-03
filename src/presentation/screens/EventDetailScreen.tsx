import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, MapPin, CalendarDays, Users, Pencil } from "lucide-react";
import { useEventDetail } from "../../application/hooks/useEventDetail";
import { useAuth } from "../../application/context/AuthContext";
import { QuorumMeter } from "../components/QuorumMeter";
import { CategoryBadge } from "../components/CategoryBadge";
import { ChatPanel } from "../components/ChatPanel";
import { ReportMenu } from "../components/ReportMenu";
import { RatingSection } from "../components/RatingSection";
import { isChatUnlocked } from "../../domain/services/QuorumService";

export function EventDetailScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    event,
    isLoading,
    quorum,
    myCommitment,
    commitments,
    isActing,
    actionError,
    handleCommit,
    handleCancel,
    handleCheckin,
  } = useEventDetail(eventId);

  if (isLoading || !event || !quorum || !user) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-400">
        Carregando...
      </div>
    );
  }

  const isCreator = event.criadorId === user.id;
  const isCancelled = event.status === "cancelado";
  const isConcluded = event.status === "concluido";
  const chatUnlocked = isChatUnlocked(event.status) && !isCancelled;
  const isCommitted = myCommitment && myCommitment.status !== "cancelado";
  const canCheckin = myCommitment?.status === "confirmado";
  const alreadyCheckedIn = myCommitment?.status === "check-in";

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 pb-10">
      <header className="sticky top-0 z-20 bg-ink-900/85 backdrop-blur-md border-b border-ink-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-ink-300 hover:text-ink-100">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display font-semibold truncate flex-1">{event.titulo}</h1>
        {isCreator && !isCancelled && (
          <button
            onClick={() => navigate(`/eventos/${event.id}/editar`)}
            className="p-2 text-ink-300 hover:text-ink-100"
            aria-label="Editar"
          >
            <Pencil size={18} />
          </button>
        )}
        <ReportMenu eventId={event.id} criadorId={event.criadorId} />
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {isCancelled && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-red-400">
              Esta proposta foi cancelada pelo organizador.
            </p>
          </div>
        )}

        <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CategoryBadge categoria={event.categoria} />
              <h2 className="font-display text-xl font-semibold mt-2">{event.titulo}</h2>
            </div>
            {!isCancelled && <QuorumMeter quorum={quorum} />}
          </div>

          <p className="text-sm text-ink-300 leading-relaxed">{event.descricao}</p>

          <div className="flex flex-col gap-2 text-sm text-ink-400">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} />
              {format(new Date(event.dataHora), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={16} />
              {event.local.endereco}
            </span>
            {!isCancelled && (
              <span className="flex items-center gap-2">
                <Users size={16} />
                {quorum.vagasConfirmadas} de {quorum.vagasTotal} vagas confirmadas
                {quorum.quorumAtingido
                  ? " · quórum atingido 🎉"
                  : ` · faltam ${quorum.quorumMinimo - quorum.vagasConfirmadas} para o quórum`}
              </span>
            )}
          </div>

          {actionError && <p className="text-sm text-red-400">{actionError}</p>}

          {!isCancelled && !isCreator && !isCommitted && (
            <button
              onClick={handleCommit}
              disabled={isActing || quorum.vagasEsgotadas}
              className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-ink-950 font-semibold py-3 rounded-xl transition-colors"
            >
              {quorum.vagasEsgotadas ? "Vagas esgotadas" : "Comprometer-se"}
            </button>
          )}

          {!isCancelled && !isCreator && isCommitted && !alreadyCheckedIn && (
            <div className="space-y-2">
              <p className="text-sm text-quorum-500 font-medium">✓ Compromisso registrado</p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isActing}
                  className="flex-1 border border-ink-600 text-ink-300 font-semibold py-2.5 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                {canCheckin && (
                  <button
                    onClick={handleCheckin}
                    disabled={isActing}
                    className="flex-1 bg-quorum-500 text-ink-950 font-semibold py-2.5 rounded-xl text-sm"
                  >
                    Fazer check-in
                  </button>
                )}
              </div>
            </div>
          )}

          {alreadyCheckedIn && (
            <p className="text-sm text-quorum-500 font-medium">✓ Check-in confirmado — bom evento!</p>
          )}
        </div>

        {isConcluded && alreadyCheckedIn && (
          <RatingSection eventId={event.id} commitments={commitments} currentUserId={user.id} />
        )}

        {chatUnlocked && isCommitted && eventId && <ChatPanel eventId={eventId} />}

        {chatUnlocked && !isCommitted && !isCreator && (
          <p className="text-center text-sm text-ink-500">
            O chat já foi liberado para quem confirmou presença.
          </p>
        )}
      </main>
    </div>
  );
}
