import { QRCodeSVG } from "qrcode.react";
import type { QuorumSummary } from "../../domain/services/QuorumService";
import { Avatar } from "./Avatar";

type StampTone = "confirmed" | "urgent" | "sold-out";

const STAMP_TONE_CLASS: Record<StampTone, string> = {
  confirmed: "text-quorum-500",
  urgent: "text-coral-500",
  "sold-out": "text-ink-400",
};

/** Decide o selo-carimbo do ingresso — só substitui a contagem
 * regressiva quando há algo mais decisivo pra dizer (quórum batido,
 * vagas acabando ou esgotadas). Fora isso, o card mostra o countdown
 * normal, sem carimbo. */
export function ticketStampFor(
  quorum: Pick<QuorumSummary, "quorumAtingido" | "vagasEsgotadas" | "vagasRestantes">
): { label: string; tone: StampTone } | null {
  if (quorum.vagasEsgotadas && !quorum.quorumAtingido) return { label: "Esgotado", tone: "sold-out" };
  if (quorum.quorumAtingido) return { label: "Confirmado", tone: "confirmed" };
  if (quorum.vagasRestantes > 0 && quorum.vagasRestantes <= 3) return { label: "Últimas vagas", tone: "urgent" };
  return null;
}

export function TicketStamp({ label, tone }: { label: string; tone: StampTone }) {
  return (
    <span
      className={`ticket-stamp bg-ink-950/50 backdrop-blur-sm text-[10px] ${STAMP_TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

/** Número sequencial "de bilhete" — puramente estético (não é um
 * contador real), derivado de forma determinística do id do evento
 * pra parecer autêntico sem precisar de coluna nova no banco. */
export function ticketNumberFor(eventId: string): string {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash * 31 + eventId.charCodeAt(i)) >>> 0;
  }
  return String(hash % 100000).padStart(5, "0");
}

/** A folha de papel inteira do bilhete: código + anfitrião + TUDO que
 * vem depois (título, ações, confirmados) moram juntos aqui — não só
 * uma tarja fina. É essa folha inteira que "cai" 3px no hover, como
 * se fosse a parte destacável do ingresso. `children` é o conteúdo
 * de cada tela (varia entre feed e detalhe), sempre em tom de papel. */
export function TicketPaperFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="ticket-canhoto">
      <div className="ticket-paper">{children}</div>
      <div className="ticket-stub-perf" />
    </div>
  );
}

export function TicketCodeRow({
  eventId,
  shareUrl,
  organizerName,
  organizerPhotoUrl,
}: {
  eventId: string;
  shareUrl: string;
  organizerName?: string;
  organizerPhotoUrl?: string | null;
}) {
  const code = `ZUV-${eventId.slice(0, 6).toUpperCase()}`;

  return (
    <div className="flex items-stretch gap-3 px-4 pt-4 pb-3">
      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
        <div>
          <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-quorum-600">
            CÓDIGO DO EVENTO
          </p>
          <p className="font-mono text-lg font-bold tracking-[0.06em] text-paper-ink truncate">
            {code}
          </p>
        </div>

        <div className="h-px bg-paper-ink/15 my-2" />

        <div className="flex items-center gap-2 min-w-0">
          <Avatar fotoUrl={organizerPhotoUrl} nome={organizerName} size={24} />
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] text-paper-ink/60">organizado por</p>
            <p className="text-[12px] font-bold text-paper-ink truncate">
              {organizerName ?? "..."}
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-center justify-center gap-1">
        <div className="bg-white p-1.5 rounded-md">
          <QRCodeSVG value={shareUrl} size={54} bgColor="#ffffff" fgColor="#2A2013" />
        </div>
        <p className="font-mono text-[8px] tracking-[0.15em] text-paper-ink/45">
          Nº {ticketNumberFor(eventId)}
        </p>
      </div>
    </div>
  );
}
