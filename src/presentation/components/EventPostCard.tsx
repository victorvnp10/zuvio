import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { getCountdownLabel, isUrgent } from "../../domain/valueObjects/EventTiming";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { useEventLikeToggle } from "../../application/hooks/useEventLikeToggle";
import { useQuorumCelebration } from "../../application/hooks/useQuorumCelebration";
import { Avatar } from "./Avatar";
import { QuorumMeter } from "./QuorumMeter";
import { Confetti } from "./Confetti";
import { CATEGORY_COVER, CATEGORY_DOT } from "./CategoryBadge";
import type { EventProposal } from "../../domain/entities/types";

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
  currentUserId: string;
  myCommitmentId?: string;
  onQuickCommit: () => void;
  onQuickCancel: () => void;
  isPending: boolean;
}) {
  const navigate = useNavigate();
  const { data: organizador } = usePublicProfile(event.criadorId);
  const quorum = summarizeQuorum(event);
  const cover = CATEGORY_COVER[event.categoria];
  const now = new Date().toISOString();
  const countdown = getCountdownLabel(event.dataHora, now);
  const urgent = isUrgent(event.dataHora, now);
  const celebrating = useQuorumCelebration(quorum.quorumAtingido);

  const [isLiked, setIsLiked] = useState(likerIds.includes(currentUserId));
  const [likeCount, setLikeCount] = useState(likerIds.length);
  const { toggle: toggleLike, isPending: isLikePending } = useEventLikeToggle(
    event.id,
    currentUserId
  );

  const handleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    await toggleLike(wasLiked).catch(() => {
      setIsLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/eventos/${event.id}`;
    if (navigator.share) {
      await navigator.share({ title: event.titulo, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    // A caixa "ticket": cantos arredondados + borda nos 4 lados +
    // overflow hidden — é o que faz o card parecer uma ficha de
    // ingresso flutuante, não um post de feed contínuo.
    <article className="rounded-[20px] bg-ink-900 border border-ink-800 overflow-hidden">
      {/* Imagem, com selos flutuando direto nela e o anel de quórum
          sempre no mesmo canto — a assinatura visual do Zuvio. */}
      <div className="relative">
        {celebrating && <Confetti />}
        <button
          onClick={() => navigate(`/eventos/${event.id}`)}
          className={`w-full aspect-square flex items-end ${
            event.capaUrl ? "" : `bg-gradient-to-br ${cover.gradient}`
          }`}
          style={
            event.capaUrl
              ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,14,26,0) 40%, rgba(11,14,26,0.55) 100%)" }} />
          {!event.capaUrl && (
            <span className="absolute inset-0 flex items-center justify-center text-7xl opacity-90">
              {cover.emoji}
            </span>
          )}
        </button>

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 bg-ink-950/55 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_DOT[event.categoria] }} />
            {event.categoria.charAt(0).toUpperCase() + event.categoria.slice(1)}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
              quorum.quorumAtingido
                ? "bg-quorum-500 text-ink-950"
                : urgent
                ? "bg-coral-500 text-ink-950"
                : "bg-ink-950/55 backdrop-blur-sm text-ink-100"
            }`}
          >
            {quorum.quorumAtingido ? "CONFIRMADO 🔓" : countdown}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="bg-ink-950/60 backdrop-blur-sm rounded-full p-0.5">
            <QuorumMeter quorum={quorum} size={46} />
          </div>
          {participantIds.length > 0 && <ConfirmedStack participantIds={participantIds} />}
        </div>
      </div>

      {/* Divisória de canhoto de ingresso — sem margem lateral, os
          recortes cortam nas bordas do card (overflow hidden acima). */}
      <div className="ticket-stub-divider" />

      <div className="pt-3.5 px-4 pb-4">
        {/* Título em destaque, logo abaixo da imagem */}
        <button onClick={() => navigate(`/eventos/${event.id}`)} className="w-full text-left">
          <h2 className="font-display font-bold text-[19px] leading-tight tracking-tight text-ink-100 mb-1">
            {event.titulo}
          </h2>
          <p className="text-xs text-ink-400 mb-3">
            {format(new Date(event.dataHora), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })} ·{" "}
            {event.local.endereco}
          </p>
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
            onClick={(e) => {
              e.stopPropagation();
              if (isCommitted) onQuickCancel();
              else onQuickCommit();
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
    </article>
  );
}
