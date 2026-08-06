import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Pencil,
  Trash2,
  XCircle,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useEventDetail } from "../../application/hooks/useEventDetail";
import { useManageMyEvent } from "../../application/hooks/useManageMyEvent";
import { useEventLikeState } from "../../application/hooks/useEventLikeState";
import { useQuorumCelebration } from "../../application/hooks/useQuorumCelebration";
import { usePresenceCelebration } from "../../application/hooks/usePresenceCelebration";
import { useAuth } from "../../application/context/AuthContext";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { categoryGradientStyle } from "../components/CategoryBadge";
import { useCategories, findCategory } from "../../application/hooks/useCategories";
import { Confetti } from "../components/Confetti";
import { PresenceCelebration } from "../components/PresenceCelebration";
import { CheckinReward } from "../components/CheckinReward";
import { MapLinksRow } from "../components/MapLinksRow";
import { getCountdownLabel, isUrgent } from "../../domain/valueObjects/EventTiming";
import { ChatPanel } from "../components/ChatPanel";
import { AnnouncementsSection } from "../components/AnnouncementsSection";
import { ParticipantsModal } from "../components/ParticipantsModal";
import {
  ConfirmedStack,
  TicketAttendance,
  TicketCodeRow,
  TicketInfoGrid,
  TicketPaperFrame,
  TicketPerforation,
  TicketStamp,
  ticketStampFor,
} from "../components/TicketStub";
import { ReportMenu } from "../components/ReportMenu";
import { RatingSection } from "../components/RatingSection";
import { EventCostSection } from "../components/EventCostSection";
import { CollaborativeListSection } from "../components/CollaborativeListSection";
import { ConferenceScheduleSection } from "../components/ConferenceScheduleSection";
import { EventPhotosSection } from "../components/EventPhotosSection";
import { InviteLinkSection } from "../components/InviteLinkSection";
import { BottomNav } from "../layout/BottomNav";
import { isChatUnlocked } from "../../domain/services/QuorumService";

export function EventDetailScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cancelEvent, deleteEvent, isSubmitting: isManaging } = useManageMyEvent();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
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
    checkinResult,
    clearCheckinResult,
    refetch,
  } = useEventDetail(eventId);

  const like = useEventLikeState(eventId ?? "", user?.id ?? "");
  const celebrating = useQuorumCelebration(quorum?.quorumAtingido ?? false);
  const { celebrating: presenceCelebrating, celebrate } = usePresenceCelebration();
  const { data: organizador } = usePublicProfile(event?.criadorId);
  const { data: categories } = useCategories();

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
  const categoria = findCategory(categories, event.categoria);
  const shareUrl = window.location.href;
  const stamp = ticketStampFor(quorum);
  const participantIds = commitments
    .filter((c) => c.status !== "cancelado")
    .map((c) => c.userId);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: event.titulo, url: shareUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleCommitClick = async () => {
    const ok = await handleCommit();
    if (ok) celebrate();
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 pb-20">
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
        {isCreator && !isCancelled && (
          <button
            onClick={() => setConfirmingRemoval(true)}
            className="p-2 text-ink-300 hover:text-red-400"
            aria-label={quorum.quorumAtingido ? "Cancelar evento" : "Excluir evento"}
          >
            {quorum.quorumAtingido ? <XCircle size={18} /> : <Trash2 size={18} />}
          </button>
        )}
        <ReportMenu eventId={event.id} criadorId={event.criadorId} />
      </header>

      <main className="max-w-lg mx-auto space-y-4">
        {isCancelled && (
          <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-red-400">
              Esta proposta foi cancelada pelo organizador.
            </p>
          </div>
        )}

        {/* Mesmo conceito do feed: hero minimalista (só ícone/capa +
            nome), corpo principal em seções (data/hora/local,
            confirmados) e canhoto de papel no fim — tudo dentro de um
            único `group`, pra só o canhoto cair 2-3px quando o mouse
            passa. */}
        <div className="group relative mx-4 mt-4 rounded-2xl overflow-hidden bg-ink-900">
          <div className="relative">
            {celebrating && <Confetti />}
            {presenceCelebrating && <PresenceCelebration />}
            <div
              className="relative w-full min-h-[260px] flex flex-col items-center justify-center gap-4 px-8 py-10 text-center"
              style={
                event.capaUrl
                  ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : categoryGradientStyle(categoria.cor)
              }
            >
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,14,26,0.15) 0%, rgba(11,14,26,0.55) 100%)" }} />
              {/* Brilho sutil sobre a capa/gradiente — impressão premium. */}
              <div className="ticket-sheen absolute inset-0 pointer-events-none" />
              {!event.capaUrl && (
                <span className="relative z-10 text-6xl opacity-90">
                  <span className="category-icon-float">{categoria.emoji}</span>
                </span>
              )}
              <h2 className="relative z-10 font-display font-bold text-2xl leading-tight tracking-tight text-white drop-shadow-sm">
                {event.titulo}
              </h2>
            </div>

            {!isCancelled && (
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                <span className="inline-flex items-center gap-1.5 bg-ink-950/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold text-white">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoria.cor }} />
                  {categoria.nome}
                </span>
                {stamp ? (
                  <TicketStamp label={stamp.label} tone={stamp.tone} />
                ) : (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                      isUrgent(event.dataHora, new Date().toISOString())
                        ? "bg-coral-500 text-ink-950"
                        : "bg-ink-950/60 backdrop-blur-sm text-white"
                    }`}
                  >
                    {getCountdownLabel(event.dataHora, new Date().toISOString())}
                  </span>
                )}
              </div>
            )}
          </div>

          {!isCancelled && (
            <>
              {/* Corpo principal, em três colunas — mais rápido de ler
                  que texto corrido. */}
              <TicketInfoGrid dataHora={event.dataHora} endereco={event.local.endereco} />

              {/* Confirmados: o anel de quórum (assinatura do Zuvio) +
                  quem já confirmou. */}
              <TicketAttendance
                quorum={quorum}
                rightSlot={
                  <button onClick={() => setShowParticipants(true)} aria-label="Ver participantes">
                    {participantIds.length > 0 && <ConfirmedStack participantIds={participantIds} />}
                  </button>
                }
              />

              <TicketPerforation />

              {/* O canhoto de papel — código, anfitrião e QR; é só essa
                  folha que "cai" 2-3px quando o mouse passa no card. */}
              <TicketPaperFrame>
                <TicketCodeRow
                  eventId={event.id}
                  shareUrl={shareUrl}
                  organizerName={organizador?.nome}
                  organizerPhotoUrl={organizador?.fotoUrl}
                />
              </TicketPaperFrame>
            </>
          )}
        </div>

        {/* Ações sociais, fora do ingresso — como reações a um post,
            não como parte do bilhete. */}
        <div className="flex items-center gap-4 px-4">
          <button onClick={like.toggle} disabled={like.isPending} aria-label="Curtir">
            <Heart
              size={26}
              strokeWidth={1.8}
              className={like.isLiked ? "fill-coral-500 text-coral-500" : "text-ink-200"}
            />
          </button>
          <button
            onClick={() =>
              document.getElementById("comentarios")?.scrollIntoView({ behavior: "smooth" })
            }
            aria-label="Ir para comentários"
          >
            <MessageCircle size={26} strokeWidth={1.8} className="text-ink-200" />
          </button>
          <button onClick={handleShare} aria-label="Compartilhar">
            <Share2 size={24} strokeWidth={1.8} className="text-ink-200" />
          </button>

          {!isCancelled && !isCreator && (
            <button
              onClick={isCommitted ? handleCancel : handleCommitClick}
              disabled={isActing || (!isCommitted && quorum.vagasEsgotadas)}
              className={`ml-auto text-[13px] font-bold py-2 px-[18px] rounded-full transition-colors ${
                isCommitted
                  ? "bg-quorum-500/15 border border-quorum-500/50 text-quorum-500"
                  : "bg-coral-500 text-ink-950 disabled:opacity-50"
              }`}
            >
              {isCommitted
                ? "Participando ✓"
                : quorum.vagasEsgotadas
                ? "Vagas esgotadas"
                : "Participar"}
            </button>
          )}
        </div>

        {like.likeCount > 0 && (
          <p className="text-sm font-semibold text-ink-200 px-4 -mt-1">
            {like.likeCount} curtida{like.likeCount === 1 ? "" : "s"}
          </p>
        )}

        {actionError && <p className="text-sm text-red-400 px-4">{actionError}</p>}

        {isCommitted && !alreadyCheckedIn && canCheckin && (
          <div className="px-4">
            <button
              onClick={handleCheckin}
              disabled={isActing}
              className="w-full bg-quorum-500 text-ink-950 font-semibold py-2.5 rounded-xl text-sm"
            >
              Fazer check-in
            </button>
          </div>
        )}

        {alreadyCheckedIn && (
          <p className="text-sm text-quorum-500 font-medium px-4">
            ✓ Check-in confirmado — bom evento!
          </p>
        )}

        {/* Mural de avisos do organizador — logo no topo, antes até da
            descrição, porque é informação que precisa chegar rápido
            (mudança de horário/local etc.), sem depender do quórum. */}
        {!isCancelled && (isCommitted || isCreator) && eventId && (
          <div className="mx-4">
            <AnnouncementsSection eventId={eventId} isCreator={isCreator} />
          </div>
        )}

        {/* Detalhes do evento — mesmo padrão de sempre */}
        <div className="mx-4 bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-ink-300 leading-relaxed">{event.descricao}</p>
          <div className="flex flex-col gap-2 text-sm text-ink-400">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} />
              {format(new Date(event.dataHora), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              {event.dataHoraFim &&
                ` até ${format(new Date(event.dataHoraFim), "dd 'de' MMMM", { locale: ptBR })}`}
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={16} />
              {event.local.endereco}
            </span>
          </div>
          <MapLinksRow local={event.local} />
        </div>

        <div className="mx-4 space-y-4" id="comentarios">
          {isConcluded && alreadyCheckedIn && (
            <RatingSection eventId={event.id} commitments={commitments} currentUserId={user.id} />
          )}

          {isCreator && event.modalidade === "restrita" && eventId && (
            <InviteLinkSection eventId={eventId} />
          )}

          {!isCancelled && event.tipoEvento !== "livre" && eventId && (
            <EventCostSection
              event={event}
              eventId={eventId}
              myCommitment={myCommitment}
              commitments={commitments}
              onPaymentConfirmed={refetch}
            />
          )}

          {!isCancelled && event.tipoEvento === "colaborativo" && eventId && (isCreator || isCommitted) && (
            <CollaborativeListSection
              eventId={eventId}
              modoLista={event.modoListaColaborativa}
              currentUserId={user.id}
              isCreator={isCreator}
            />
          )}

          {event.tipoEvento === "conferencia" && eventId && (
            <ConferenceScheduleSection eventId={eventId} isCreator={isCreator} isCommitted={Boolean(isCommitted)} />
          )}

          {/* Chat primeiro — é o que ajuda a organizar o evento, então
              fica mais visível/perto do topo do que as fotos. */}
          {chatUnlocked && (isCommitted || isCreator) && eventId && <ChatPanel eventId={eventId} />}

          {chatUnlocked && !isCommitted && !isCreator && (
            <p className="text-center text-sm text-ink-500">
              O chat já foi liberado para quem confirmou presença.
            </p>
          )}

          {!isCancelled && eventId && (isCommitted || isCreator) && (
            <EventPhotosSection
              eventId={eventId}
              currentUserId={user.id}
              isCreator={isCreator}
              fotosPublicas={event.fotosPublicas}
            />
          )}
        </div>
      </main>

      {confirmingRemoval && (
        <div className="fixed inset-0 bg-ink-950/80 flex items-center justify-center p-4 z-50">
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-display font-semibold text-lg">
              {quorum.quorumAtingido ? "Cancelar esta proposta?" : "Excluir esta proposta?"}
            </h3>
            <p className="text-sm text-ink-400">
              {quorum.quorumAtingido
                ? "Quem já confirmou presença vai ver que o evento foi cancelado. Essa ação não pode ser desfeita."
                : "O quórum ainda não foi atingido — a proposta será apagada de vez, sem deixar rastro."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingRemoval(false)}
                className="flex-1 border border-ink-600 text-ink-300 font-semibold py-2.5 rounded-xl text-sm"
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  const ok = quorum.quorumAtingido
                    ? await cancelEvent(event.id)
                    : await deleteEvent(event.id);
                  setConfirmingRemoval(false);
                  if (ok) navigate("/meus-eventos");
                }}
                disabled={isManaging}
                className="flex-1 bg-red-500 disabled:opacity-50 text-ink-950 font-semibold py-2.5 rounded-xl text-sm"
              >
                {isManaging ? "Aguarde..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showParticipants && (
        <ParticipantsModal
          commitments={commitments}
          organizadorId={event.criadorId}
          onClose={() => setShowParticipants(false)}
        />
      )}

      {checkinResult && <CheckinReward result={checkinResult} onDismiss={clearCheckinResult} />}

      <BottomNav />
    </div>
  );
}
