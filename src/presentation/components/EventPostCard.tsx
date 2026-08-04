import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, MessageCircle, Share2, MapPin } from "lucide-react";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { useEventLikeToggle } from "../../application/hooks/useEventLikeToggle";
import { Avatar } from "./Avatar";
import { QuorumMeter } from "./QuorumMeter";
import { CATEGORY_COVER } from "./CategoryBadge";
import type { EventProposal } from "../../domain/entities/types";

function ConfirmedStack({ participantIds }: { participantIds: string[] }) {
  const shown = participantIds.slice(0, 3);
  return (
    <div className="flex -space-x-2">
      {shown.map((id) => (
        <ParticipantDot key={id} userId={id} />
      ))}
    </div>
  );
}

function ParticipantDot({ userId }: { userId: string }) {
  const { data: profile } = usePublicProfile(userId);
  return (
    <div className="ring-2 ring-ink-900 rounded-full">
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
    <article className="bg-ink-900 border-b border-ink-800 pb-3">
      {/* Título em destaque, no topo — é o "assunto" do post */}
      <button
        onClick={() => navigate(`/eventos/${event.id}`)}
        className="w-full text-left px-3 pt-3 pb-2"
      >
        <h2 className="font-display font-semibold text-lg text-ink-100 leading-snug">
          {event.titulo}
        </h2>
      </button>

      {/* Imagem, com o anel de quórum sobreposto no canto */}
      <div className="relative">
        <button
          onClick={() => navigate(`/eventos/${event.id}`)}
          className={`w-full aspect-square flex items-center justify-center ${
            event.capaUrl ? "" : `bg-gradient-to-br ${cover.gradient}`
          }`}
          style={
            event.capaUrl
              ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {!event.capaUrl && <span className="text-7xl opacity-90">{cover.emoji}</span>}
        </button>
        <div className="absolute top-3 left-3 bg-ink-900/70 backdrop-blur-sm rounded-full p-1">
          <QuorumMeter quorum={quorum} size={44} />
        </div>
        {event.tipoEvento !== "livre" && (
          <span className="absolute top-3 right-3 text-xs font-semibold bg-ink-900/70 backdrop-blur-sm text-amber-500 px-2 py-1 rounded-full">
            {event.tipoEvento === "pago" ? "💰 Pago" : "🍲 Colaborativo"}
          </span>
        )}
      </div>

      {/* Ações: curtir (de verdade), comentar, compartilhar — e o botão de Participar, separado e óbvio */}
      <div className="flex items-center gap-4 px-3 pt-2.5">
        <button onClick={handleLike} disabled={isLikePending} aria-label={isLiked ? "Descurtir" : "Curtir"}>
          <Heart
            size={26}
            strokeWidth={1.8}
            className={isLiked ? "fill-coral-500 text-coral-500" : "text-ink-200"}
          />
        </button>
        <button onClick={() => navigate(`/eventos/${event.id}`)} aria-label="Comentar">
          <MessageCircle size={26} strokeWidth={1.8} className="text-ink-200" />
        </button>
        <button onClick={handleShare} aria-label="Compartilhar">
          <Share2 size={24} strokeWidth={1.8} className="text-ink-200" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isCommitted) onQuickCancel();
            else onQuickCommit();
          }}
          disabled={isPending || isOwnEvent || (!isCommitted && quorum.vagasEsgotadas)}
          className={`ml-auto text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${
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

      {likeCount > 0 && (
        <p className="text-sm font-semibold text-ink-200 px-3 pt-2">
          {likeCount} curtida{likeCount === 1 ? "" : "s"}
        </p>
      )}

      {/* Confirmados / quórum */}
      <div className="flex items-center gap-2 px-3 pt-2">
        {participantIds.length > 0 && <ConfirmedStack participantIds={participantIds} />}
        <p className="text-sm text-ink-200">
          <span className="font-semibold">{quorum.vagasConfirmadas}</span> confirmado
          {quorum.vagasConfirmadas === 1 ? "" : "s"} de {quorum.vagasTotal}
          {quorum.quorumAtingido ? (
            <span className="text-quorum-500 font-semibold"> · quórum atingido 🔓</span>
          ) : (
            <span className="text-ink-500"> · faltam {quorum.quorumMinimo - quorum.vagasConfirmadas} p/ quórum</span>
          )}
        </p>
      </div>

      {/* Legenda + anfitrião, embaixo */}
      <div className="px-3 pt-1.5 space-y-1.5">
        <p className="text-sm text-ink-300">{event.descricao}</p>
        <p className="text-xs text-ink-500 flex items-center gap-1">
          <MapPin size={11} />
          {format(new Date(event.dataHora), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
        </p>
        <div className="flex items-center gap-1.5 pt-1">
          <Avatar fotoUrl={organizador?.fotoUrl} nome={organizador?.nome} size={18} />
          <span className="text-xs text-ink-500">
            Organizado por <span className="text-ink-300 font-medium">{organizador?.nome ?? "..."}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
