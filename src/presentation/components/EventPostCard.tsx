import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Users } from "lucide-react";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { getCountdownLabel, isUrgent } from "../../domain/valueObjects/EventTiming";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { useEventLikeToggle } from "../../application/hooks/useEventLikeToggle";
import { useQuorumCelebration } from "../../application/hooks/useQuorumCelebration";
import { usePresenceCelebration } from "../../application/hooks/usePresenceCelebration";
import { Confetti } from "./Confetti";
import { PresenceCelebration } from "./PresenceCelebration";
import { ParticipantsModal } from "./ParticipantsModal";
import {
  ConfirmedStack,
  TicketCodeRow,
  TicketHeroAttendance,
  TicketHeroDivider,
  TicketHeroMeta,
  TicketPaperFrame,
  TicketPerforation,
  TicketStamp,
  ticketStampFor,
} from "./TicketStub";
import { categoryGradientStyle } from "./CategoryBadge";
import { useCategories, findCategory } from "../../application/hooks/useCategories";
import type { EventProposal, EventPhoto } from "../../domain/entities/types";

export function EventPostCard({
  event,
  participantIds,
  isCommitted,
  isPendingApproval = false,
  isOwnEvent,
  likerIds,
  photos,
  currentUserId,
  onQuickCommit,
  onQuickCancel,
  isPending,
}: {
  event: EventProposal;
  participantIds: string[];
  isCommitted: boolean;
  /** Evento com `exigeAprovacao`: inscrição enviada, aguardando o
   * organizador aprovar — ainda não é "Participando". */
  isPendingApproval?: boolean;
  isOwnEvent: boolean;
  likerIds: string[];
  /** Fotos públicas do evento (organizador liberou `fotosPublicas`) —
   * quando existem, a capa vira um carrossel "reels": passar o dedo
   * (ou tocar nas bordas) troca entre capa e as fotos. */
  photos?: EventPhoto[];
  currentUserId: string;
  myCommitmentId?: string;
  onQuickCommit: () => Promise<boolean>;
  onQuickCancel: () => void;
  /** Ação de participar/cancelar em andamento pra este card específico
   * (loading do clique, não confundir com `isPendingApproval`). */
  isPending: boolean;
}) {
  const navigate = useNavigate();
  const { data: organizador } = usePublicProfile(event.criadorId);
  const { data: categories } = useCategories();
  const categoria = findCategory(categories, event.categoria);
  const quorum = summarizeQuorum(event);
  const now = new Date().toISOString();
  const countdown = getCountdownLabel(event.dataHora, now);
  const urgent = isUrgent(event.dataHora, now);
  const celebrating = useQuorumCelebration(quorum.quorumAtingido);
  const { celebrating: presenceCelebrating, celebrate } = usePresenceCelebration();

  const [isLiked, setIsLiked] = useState(likerIds.includes(currentUserId));
  const [likeCount, setLikeCount] = useState(likerIds.length);
  const [showParticipants, setShowParticipants] = useState(false);
  const { toggle: toggleLike, isPending: isLikePending } = useEventLikeToggle(
    event.id,
    currentUserId
  );

  // Slide 0 = a capa; os seguintes são as fotos públicas do evento —
  // exatamente o conceito de "reels" pedido: passar o dedo na capa pra
  // ver as fotos, sem sair do feed.
  const slides = event.fotosPublicas && photos && photos.length > 0 ? photos : [];
  const hasReels = slides.length > 0;
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartX = useRef(0);
  const swipedRef = useRef(false);

  const goToSlide = (i: number) => setSlideIndex(Math.max(0, Math.min(i, slides.length)));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    swipedRef.current = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > 12) swipedRef.current = true;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasReels) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goToSlide(slideIndex + 1);
      else goToSlide(slideIndex - 1);
    }
  };
  const handleImageClick = () => {
    // Depois de arrastar pra trocar de foto, o toque que solta o dedo
    // não deve navegar pro detalhe — só um toque de verdade navega.
    if (swipedRef.current) return;
    navigate(`/eventos/${event.id}`);
  };

  const currentPhoto = slideIndex > 0 ? slides[slideIndex - 1] : null;
  const hasCover = Boolean(currentPhoto || event.capaUrl);

  const handleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    await toggleLike(wasLiked).catch(() => {
      setIsLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    });
  };

  const shareUrl = `${window.location.origin}/eventos/${event.id}`;
  const stamp = ticketStampFor(quorum);
  const confirmedLabel =
    isCommitted || isOwnEvent
      ? "você confirmou"
      : `${quorum.vagasConfirmadas} confirmado${quorum.vagasConfirmadas === 1 ? "" : "s"}`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: event.titulo, url: shareUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div>
      {/* A caixa "ticket": cantos arredondados + borda nos 4 lados +
          overflow hidden — é o que faz o card parecer uma ficha de
          ingresso flutuante, não um post de feed contínuo. */}
      <article className="group rounded-[20px] bg-ink-900 border border-ink-800 overflow-hidden">
        {/* Hero: tudo que identifica o evento — ícone/capa, nome,
            data/hora/local e confirmados — mora dentro da imagem. O
            ingresso tem uma única divisão: a perfuração antes do
            canhoto de papel, lá embaixo. */}
        <div className="relative">
          {celebrating && <Confetti />}
          {presenceCelebrating && <PresenceCelebration />}
          <button
            onClick={handleImageClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-full flex flex-col items-center gap-3.5 px-6 pt-16 pb-5 text-center"
            style={
              currentPhoto
                ? { backgroundImage: `url(${currentPhoto.fotoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : event.capaUrl
                ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : categoryGradientStyle(categoria.cor)
            }
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,14,26,0.1) 0%, rgba(11,14,26,0.6) 100%)" }} />
            {/* Brilho sutil sobre a capa/gradiente — impressão premium, não papel fosco. */}
            <div className="ticket-sheen absolute inset-0 pointer-events-none" />
            {!hasCover && (
              <span className="relative z-10 text-6xl opacity-90">
                <span className="category-icon-float">{categoria.emoji}</span>
              </span>
            )}
            <h2 className="relative z-10 font-display font-bold text-2xl leading-tight tracking-tight text-white drop-shadow-sm">
              {event.titulo}
            </h2>

            <TicketHeroDivider />
            <TicketHeroMeta dataHora={event.dataHora} endereco={event.local.endereco} />
            <TicketHeroAttendance
              quorum={quorum}
              confirmedLabel={confirmedLabel}
              rightSlot={participantIds.length > 0 && <ConfirmedStack participantIds={participantIds} />}
            />
          </button>

          {/* Barra segmentada estilo stories/reels — só aparece quando o
              organizador liberou fotos públicas e existem fotos pra ver. */}
          {hasReels && (
            <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
              {[0, ...slides.map((_, i) => i + 1)].map((i) => (
                <div key={i} className="h-[3px] flex-1 rounded-full bg-ink-100/30 overflow-hidden">
                  <div
                    className={`h-full bg-ink-100 rounded-full transition-all ${
                      i === slideIndex ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Zonas de toque nas bordas — igual reels/stories: tocar do
              lado volta/avança, sem precisar arrastar. */}
          {hasReels && (
            <>
              {slideIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(slideIndex - 1);
                  }}
                  className="absolute left-0 top-8 bottom-8 w-1/4 z-10"
                  aria-label="Foto anterior"
                />
              )}
              {slideIndex < slides.length && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(slideIndex + 1);
                  }}
                  className="absolute right-0 top-8 bottom-8 w-1/4 z-10"
                  aria-label="Próxima foto"
                />
              )}
            </>
          )}

          {/* Header: categoria + selo de status, acima do conteúdo do hero */}
          <div className={`absolute left-3 right-3 flex items-start justify-between z-20 ${hasReels ? "top-7" : "top-3"}`}>
            <span className="inline-flex items-center gap-1.5 bg-ink-950/55 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold text-white">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoria.cor }} />
              {categoria.nome}
            </span>
            {stamp ? (
              <TicketStamp label={stamp.label} tone={stamp.tone} />
            ) : (
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                  urgent ? "bg-coral-500 text-ink-950" : "bg-ink-950/55 backdrop-blur-sm text-white"
                }`}
              >
                {countdown}
              </span>
            )}
          </div>
        </div>

        {event.descricao && (
          <p className="text-sm text-ink-300 line-clamp-2 px-4 pt-3">{event.descricao}</p>
        )}

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
      </article>

      {/* Ações sociais, fora do ingresso — como reações a um post, não
          como parte do bilhete. */}
      <div className="flex items-center gap-3.5 mt-3 px-1">
        <button onClick={handleLike} disabled={isLikePending} aria-label={isLiked ? "Descurtir" : "Curtir"}>
          <Heart size={20} strokeWidth={1.8} className={isLiked ? "fill-coral-500 text-coral-500" : "text-ink-200"} />
        </button>
        <button onClick={() => navigate(`/eventos/${event.id}`)} aria-label="Comentar">
          <MessageCircle size={20} strokeWidth={1.8} className="text-ink-200" />
        </button>
        <button onClick={handleShare} aria-label="Compartilhar">
          <Share2 size={19} strokeWidth={1.8} className="text-ink-200" />
        </button>
        {participantIds.length > 0 && (
          <button onClick={() => setShowParticipants(true)} aria-label="Ver participantes">
            <Users size={19} strokeWidth={1.8} className="text-ink-200" />
          </button>
        )}

        <button
          onClick={async () => {
            if (isCommitted || isPendingApproval) {
              onQuickCancel();
            } else {
              const ok = await onQuickCommit();
              if (ok) celebrate();
            }
          }}
          disabled={
            isPending || isOwnEvent || (!isCommitted && !isPendingApproval && quorum.vagasEsgotadas)
          }
          className={`ml-auto text-[13px] font-bold py-2 px-[18px] rounded-full transition-colors ${
            isOwnEvent
              ? "bg-ink-800 text-ink-500 cursor-default"
              : isCommitted
              ? "bg-quorum-500/15 border border-quorum-500/50 text-quorum-500"
              : isPendingApproval
              ? "bg-amber-500/15 border border-amber-500/50 text-amber-500"
              : "bg-coral-500 text-ink-950 disabled:opacity-50"
          }`}
        >
          {isOwnEvent
            ? "Seu evento"
            : isCommitted
            ? "Participando ✓"
            : isPendingApproval
            ? "Aguardando aprovação ⏳"
            : "Participar"}
        </button>
      </div>

      {(likeCount > 0 || quorum.vagasConfirmadas > 0) && (
        <p className="text-xs text-ink-400 mt-2 px-1">
          {likeCount > 0 && (
            <span className="font-semibold text-ink-200">
              {likeCount} curtida{likeCount === 1 ? "" : "s"}
            </span>
          )}
          {likeCount > 0 && quorum.vagasConfirmadas > 0 && " · "}
          {quorum.vagasConfirmadas > 0 && (
            <>
              <span className="font-semibold text-ink-200">{quorum.vagasConfirmadas}</span> confirmado
              {quorum.vagasConfirmadas === 1 ? "" : "s"} de {quorum.vagasTotal}
            </>
          )}
        </p>
      )}

      {showParticipants && (
        <ParticipantsModal
          eventId={event.id}
          organizadorId={event.criadorId}
          onClose={() => setShowParticipants(false)}
        />
      )}
    </div>
  );
}
