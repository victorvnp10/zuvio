import { QRCodeSVG } from "qrcode.react";
import type { QuorumSummary } from "../../domain/services/QuorumService";

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

export function TicketStub({ eventId, shareUrl }: { eventId: string; shareUrl: string }) {
  const code = `ZUV-${eventId.slice(0, 6).toUpperCase()}`;

  return (
    <div className="ticket-canhoto">
      <div className="ticket-stub flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.2em] text-paper-ink/55">
            TICKET Nº {ticketNumberFor(eventId)}
          </p>
          <p className="font-mono text-sm font-bold tracking-[0.1em] text-paper-ink truncate">
            {code}
          </p>
        </div>
        <div className="shrink-0 bg-white p-1 rounded-md">
          <QRCodeSVG value={shareUrl} size={34} bgColor="#ffffff" fgColor="#2A2013" />
        </div>
      </div>
      <div className="ticket-stub-perf" />
    </div>
  );
}
