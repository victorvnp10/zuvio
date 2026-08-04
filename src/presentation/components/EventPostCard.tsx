import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Heart, MessageCircle, Share2, MapPin } from "lucide-react";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { Avatar } from "./Avatar";
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
  onQuickCommit,
  onQuickCancel,
  isPending,
}: {
  event: EventProposal;
  participantIds: string[];
  isCommitted: boolean;
  isOwnEvent: boolean;
  myCommitmentId?: string;
  onQuickCommit: () => void;
  onQuickCancel: () => void;
  isPending: boolean;
}) {
  const navigate = useNavigate();
  const { data: organizador } = usePublicProfile(event.criadorId);
  const quorum = summarizeQuorum(event);
  const cover = CATEGORY_COVER[event.categoria];

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
      <button
        onClick={() => navigate(`/eventos/${event.id}`)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <Avatar fotoUrl={organizador?.fotoUrl} nome={organizador?.nome} size={32} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-100 truncate">
            {organizador?.nome ?? "..."}
          </p>
          <p className="text-xs text-ink-500 truncate">{event.local.endereco}</p>
        </div>
        {event.tipoEvento !== "livre" && (
          <span className="text-xs font-semibold text-amber-500 shrink-0">
            {event.tipoEvento === "pago" ? "💰" : "🍲"}
          </span>
        )}
      </button>

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

      <div className="flex items-center gap-4 px-3 pt-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isCommitted) onQuickCancel();
            else onQuickCommit();
          }}
          disabled={isPending || isOwnEvent || (!isCommitted && quorum.vagasEsgotadas)}
          aria-label={isCommitted ? "Cancelar presença" : "Comprometer-se"}
          className={isOwnEvent ? "opacity-30 cursor-default" : ""}
          title={isOwnEvent ? "Você é o organizador deste evento" : undefined}
        >
          <Heart
            size={26}
            strokeWidth={1.8}
            className={isCommitted ? "fill-coral-500 text-coral-500" : "text-ink-200"}
          />
        </button>
        <button onClick={() => navigate(`/eventos/${event.id}`)} aria-label="Comentar">
          <MessageCircle size={26} strokeWidth={1.8} className="text-ink-200" />
        </button>
        <button onClick={handleShare} aria-label="Compartilhar">
          <Share2 size={24} strokeWidth={1.8} className="text-ink-200" />
        </button>
      </div>

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

      <div className="px-3 pt-1.5 space-y-0.5">
        <p className="text-sm text-ink-100">
          <span className="font-semibold">{event.titulo}</span>{" "}
          <span className="text-ink-300">{event.descricao}</span>
        </p>
        <p className="text-xs text-ink-500 flex items-center gap-1 pt-0.5">
          <MapPin size={11} />
          {format(new Date(event.dataHora), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
    </article>
  );
}
