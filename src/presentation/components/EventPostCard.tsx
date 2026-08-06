import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { getCountdownLabel, isUrgent } from "../../domain/valueObjects/EventTiming";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { useEventLikeToggle } from "../../application/hooks/useEventLikeToggle";
import { useQuorumCelebration } from "../../application/hooks/useQuorumCelebration";
import { usePresenceCelebration } from "../../application/hooks/usePresenceCelebration";
import { Avatar } from "./Avatar";
import { QuorumMeter } from "./QuorumMeter";
import { Confetti } from "./Confetti";
import { PresenceCelebration } from "./PresenceCelebration";
import { ParticipantsModal } from "./ParticipantsModal";
import { TicketStamp, TicketStub, ticketStampFor } from "./TicketStub";
import { categoryGradientStyle } from "./CategoryBadge";
import { useCategories, findCategory } from "../../application/hooks/useCategories";
import type { EventProposal, EventPhoto } from "../../domain/entities/types";

function ConfirmedStack({ participantIds }: { participantIds: string[] }) {
  const shown = participantIds.slice(0, 3);
  const extra = participantIds.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((id) => (
        <ParticipantDot key={id} userId={id} />
      ))}
      {extra > 0 && (
        <div className="ring-2 ring-ink-950 rounded-full w-[22px] h-[22px] flex items-center justify-center bg-ink-500 text-[9px] font-bold text-ink-950">
          +{extra}
        </div>
      )}
    </div>
  );
}

function ParticipantDot({ userId }: { userId: string }) {
  const { data: profile } = usePublicProfile(userId);
  return (
    <div className="ring-2 ring-ink-950 rounded-full">
      <Avatar fotoUrl={profile?.fotoUrl} nome={profile?.nome} size={22} />
    </div>
  );
}

export function EventPostCard({
  event,
  participantIds,
  isCommitted,
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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      await navigator.share({ title: event.titulo, url: shareUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    // A caixa "ticket": cantos arredondados + borda nos 4 lados +
    // overflow hidden — é o que faz o card parecer uma ficha de
    // ingresso flutuante, não um post de feed contínuo.
    <article className="group rounded-[20px] bg-ink-900 border border-ink-800 overflow-hidden">
      {/* Imagem, com selos flutuando direto nela e o anel de quórum
          sempre no mesmo canto — a assinatura visual do Zuvio. */}
      <div className="relative">
        {celebrating && <Confetti />}
        {presenceCelebrating && <PresenceCelebration />}
        <button
          onClick={handleImageClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full aspect-square flex items-end"
          style={
            currentPhoto
              ? { backgroundImage: `url(${currentPhoto.fotoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : event.capaUrl
              ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : categoryGradientStyle(categoria.cor)
          }
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,14,26,0) 40%, rgba(11,14,26,0.55) 100%)" }} />
          {/* Brilho sutil sobre a capa/gradiente — impressão premium, não papel fosco. */}
          <div className="ticket-sheen absolute inset-0 pointer-events-none" />
          {!currentPhoto && !event.capaUrl && (
            <span className="absolute inset-0 flex items-center justify-center text-7xl opacity-90">
              <span className="category-icon-float">{categoria.emoji}</span>
            </span>
          )}
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

        <div className={`absolute left-3 right-3 flex items-start justify-between z-20 ${hasReels ? "top-7" : "top-3"}`}>
          <span className="inline-flex items-center gap-1.5 bg-ink-950/55 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoria.cor }} />
            {categoria.nome}
          </span>
          {stamp ? (
            <TicketStamp label={stamp.label} tone={stamp.tone} />
          ) : (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                urgent ? "bg-coral-500 text-ink-950" : "bg-ink-950/55 backdrop-blur-sm text-ink-100"
              }`}
            >
              {countdown}
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowParticipants(true);
            }}
            className="bg-ink-950/60 backdrop-blur-sm rounded-full p-0.5"
            aria-label="Ver participantes"
          >
            <QuorumMeter quorum={quorum} size={46} />
          </button>
          {participantIds.length > 0 && <ConfirmedStack participantIds={participantIds} />}
        </div>
      </div>

      {/* Canhoto de ingresso — sem margem lateral, os picotes cortam
          nas bordas do card (overflow hidden acima). Papel, QR e
          código reforçam que isto é um ticket de verdade, não só um
          post de feed; cai 2-3px quando o mouse passa no card. */}
      <TicketStub eventId={event.id} shareUrl={shareUrl} />

      <div className="pt-3.5 px-4 pb-4">
        {/* Título em destaque, logo abaixo da imagem */}
        <button onClick={() => navigate(`/eventos/${event.id}`)} className="w-full text-left">
          <h2 className="font-display font-bold text-[19px] leading-tight tracking-tight text-ink-100 mb-1">
            {event.titulo}
          </h2>
          <p className={`text-xs text-ink-400 ${event.descricao ? "mb-1.5" : "mb-3"}`}>
            {format(new Date(event.dataHora), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })} ·{" "}
            {event.local.endereco}
          </p>
          {event.descricao && (
            <p className="text-sm text-ink-300 line-clamp-2 mb-3">{event.descricao}</p>
          )}
        </button>

        {/* Ações: curtir, comentar, compartilhar — e Participar, decisivo */}
        <div className="flex items-center gap-3.5">
          <button onClick={handleLike} disabled={isLikePending} aria-label={isLiked ? "Descurtir" : "Curtir"}>
            <Heart size={20} strokeWidth={1.8} className={isLiked ? "fill-coral-500 text-coral-500" : "text-ink-200"} />
          </button>
          <button onClick={() => navigate(`/eventos/${event.id}`)} aria-label="Comentar">
            <MessageCircle size={20} strokeWidth={1.8} className="text-ink-200" />
          </button>
          <button onClick={handleShare} aria-label="Compartilhar">
            <Share2 size={19} strokeWidth={1.8} className="text-ink-200" />
          </button>

          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (isCommitted) {
                onQuickCancel();
              } else {
                const ok = await onQuickCommit();
                if (ok) celebrate();
              }
            }}
            disabled={isPending || isOwnEvent || (!isCommitted && quorum.vagasEsgotadas)}
            className={`ml-auto text-[13px] font-bold py-2 px-[18px] rounded-full transition-colors ${
              isOwnEvent
                ? "bg-ink-800 text-ink-500 cursor-default"
                : isCommitted
                ? "bg-quorum-500/15 border border-quorum-500/50 text-quorum-500"
                : "bg-coral-500 text-ink-950 disabled:opacity-50"
            }`}
          >
            {isOwnEvent ? "Seu evento" : isCommitted ? "Participando ✓" : "Participar"}
          </button>
        </div>

        {/* Anfitrião, embaixo — assinatura de quem organiza */}
        <div className="flex items-center gap-2 mt-3 text-xs text-ink-400">
          <Avatar fotoUrl={organizador?.fotoUrl} nome={organizador?.nome} size={20} />
          <span>
            organizado por <b className="text-ink-200 font-bold">{organizador?.nome ?? "..."}</b>
          </span>
        </div>

        {(likeCount > 0 || quorum.vagasConfirmadas > 0) && (
          <p className="text-xs text-ink-400 mt-2">
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
      </div>

      {showParticipants && (
        <ParticipantsModal
          eventId={event.id}
          organizadorId={event.criadorId}
          onClose={() => setShowParticipants(false)}
        />
      )}
    </article>
  );
}
