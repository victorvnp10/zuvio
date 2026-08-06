import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import type { QuorumSummary } from "../../domain/services/QuorumService";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { Avatar } from "./Avatar";
import { QuorumMeter } from "./QuorumMeter";

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

/** Grade de 3 colunas — Data / Hora / Local — no lugar da linha
 * corrida de texto: mais rápida de escanear, e junto com a seção de
 * confirmados forma o "corpo principal" escuro do ingresso, acima da
 * perfuração. */
export function TicketInfoGrid({
  dataHora,
  endereco,
}: {
  dataHora: string;
  endereco: string;
}) {
  const date = new Date(dataHora);
  return (
    <div className="grid grid-cols-3 border-t border-ink-100/10">
      <div className="px-2 py-3 text-center">
        <p className="text-[9px] uppercase tracking-wide text-ink-400 mb-0.5">Data</p>
        <p className="text-sm font-bold text-ink-100">{format(date, "dd/MM", { locale: ptBR })}</p>
      </div>
      <div className="px-2 py-3 text-center border-l border-ink-100/10">
        <p className="text-[9px] uppercase tracking-wide text-ink-400 mb-0.5">Hora</p>
        <p className="text-sm font-bold text-ink-100">{format(date, "HH:mm")}</p>
      </div>
      <div className="px-2 py-3 text-center border-l border-ink-100/10 min-w-0">
        <p className="text-[9px] uppercase tracking-wide text-ink-400 mb-0.5">Local</p>
        <p className="text-sm font-bold text-ink-100 truncate" title={endereco}>
          {endereco}
        </p>
      </div>
    </div>
  );
}

/** Confirmados como componente próprio: o anel de quórum (a
 * assinatura do Zuvio) ao lado de quem já confirmou — não mais
 * flutuando sobre a capa, mas como uma seção clara do "corpo
 * principal" do ingresso, logo antes da perfuração. */
export function TicketAttendance({
  quorum,
  rightSlot,
}: {
  quorum: QuorumSummary;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-ink-100/10">
      <div className="flex items-center gap-3 min-w-0">
        <QuorumMeter quorum={quorum} size={44} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-100">
            {quorum.vagasConfirmadas} confirmado{quorum.vagasConfirmadas === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-ink-400">de {quorum.vagasTotal} pessoas</p>
        </div>
      </div>
      {rightSlot}
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

/** Pilha de avatares de quem confirmou — o "Avatar ao lado" da seção
 * de confirmados. */
export function ConfirmedStack({ participantIds }: { participantIds: string[] }) {
  const shown = participantIds.slice(0, 3);
  const extra = participantIds.length - shown.length;
  return (
    <div className="flex -space-x-2 shrink-0">
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

/** A perfuração entre o corpo escuro e o canhoto de papel: uma fileira
 * de furos redondos (não uma tarja mordida) — o motivo mais
 * reconhecível de "isto é um ingresso de verdade". */
export function TicketPerforation() {
  return <div className="ticket-perf-band" />;
}

/** O canhoto de papel — só código, anfitrião e QR moram aqui; é essa
 * folha, pequena, que "cai" 2-3px no hover, como se fosse a parte
 * destacável do ingresso (o resto do card não se move). */
export function TicketPaperFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="ticket-canhoto">
      <div className="ticket-paper">{children}</div>
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
    <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-4">
      <div className="min-w-0 flex flex-col justify-between py-0.5">
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

      {/* Separador tracejado antes do QR — a costura entre o texto do
          canhoto e o "código de barras", como num ingresso real. */}
      <div className="flex items-stretch pl-3 border-l-2 border-dashed border-paper-ink/20">
        <div className="shrink-0 flex flex-col items-center justify-center gap-1">
          <div className="bg-white p-1.5 rounded-md">
            <QRCodeSVG value={shareUrl} size={54} bgColor="#ffffff" fgColor="#2A2013" />
          </div>
          <p className="font-mono text-[8px] tracking-[0.15em] text-paper-ink/45">
            Nº {ticketNumberFor(eventId)}
          </p>
        </div>
      </div>
    </div>
  );
}
