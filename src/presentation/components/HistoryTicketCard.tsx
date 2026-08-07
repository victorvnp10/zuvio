import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { useCategories, findCategory } from "../../application/hooks/useCategories";
import { categoryGradientStyle } from "./CategoryBadge";
import {
  TicketCodeRow,
  TicketHeroDivider,
  TicketHeroMeta,
  TicketPaperFrame,
  TicketPerforation,
} from "./TicketStub";
import type { HistoryEntry } from "../../application/hooks/useHistory";

/** Espelha `recompute_reliability` (migração 0030) — só pra rotular o
 * ingresso; o total oficial vive em `profile.pontosReputacao`. */
const STATUS_DISPLAY: Record<string, { label: string; pontos: number; badgeClass: string }> = {
  "check-in": { label: "Compareceu", pontos: 10, badgeClass: "bg-quorum-500/15 text-quorum-500" },
  "no-show": { label: "Não compareceu", pontos: -15, badgeClass: "bg-red-500/15 text-red-400" },
  cancelado: { label: "Cancelado", pontos: -5, badgeClass: "bg-ink-700 text-ink-300" },
};

/** Mesmo ingresso do feed (hero fixo + canhoto de papel), mas sem as
 * ações sociais/participar — aqui o compromisso já foi resolvido, o
 * que importa é o resultado (compareceu/não compareceu/cancelado) e
 * os pontos que valeu, não uma ação nova pra tomar. */
export function HistoryTicketCard({ entry, onOpen }: { entry: HistoryEntry; onOpen: () => void }) {
  const { event, commitment } = entry;
  const { data: organizador } = usePublicProfile(event.criadorId);
  const { data: categories } = useCategories();
  const categoria = findCategory(categories, event.categoria);
  const display = STATUS_DISPLAY[commitment.status] ?? {
    label: commitment.status,
    pontos: 0,
    badgeClass: "bg-ink-700 text-ink-300",
  };
  const shareUrl = `${window.location.origin}/eventos/${event.id}`;

  return (
    <div>
      <article className="group rounded-[20px] bg-ink-900 border border-ink-800 overflow-hidden opacity-80">
        <div className="relative">
          <button
            onClick={onOpen}
            className="relative w-full aspect-[4/5] overflow-hidden flex flex-col items-center justify-center gap-3.5 px-6 py-8 text-center grayscale-[0.35]"
            style={
              event.capaUrl
                ? { backgroundImage: `url(${event.capaUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : categoryGradientStyle(categoria.cor)
            }
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,14,26,0.1) 0%, rgba(11,14,26,0.6) 100%)" }} />
            {!event.capaUrl && (
              <span className="relative z-10 text-6xl opacity-90">{categoria.emoji}</span>
            )}
            <h2 className="relative z-10 font-display font-bold text-2xl leading-tight tracking-tight text-white drop-shadow-sm line-clamp-2">
              {event.titulo}
            </h2>
            <TicketHeroDivider />
            <TicketHeroMeta dataHora={event.dataHora} endereco={event.local.endereco} />
          </button>

          <div className="absolute left-3 right-3 top-3 flex items-start justify-between z-20">
            <span className="inline-flex items-center gap-1.5 bg-ink-950/55 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold text-white">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoria.cor }} />
              {categoria.nome}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${display.badgeClass}`}>
              {display.label}
            </span>
          </div>
        </div>

        <TicketPerforation />
        <TicketPaperFrame>
          <TicketCodeRow
            eventId={event.id}
            shareUrl={shareUrl}
            organizerName={organizador?.nome}
            organizerPhotoUrl={organizador?.fotoUrl}
          />
        </TicketPaperFrame>
      </article>

      <p className={`text-xs mt-2 px-1 ${display.pontos >= 0 ? "text-quorum-500" : "text-red-400"}`}>
        {display.pontos >= 0 ? "+" : ""}
        {display.pontos} pontos de reputação
      </p>
    </div>
  );
}
