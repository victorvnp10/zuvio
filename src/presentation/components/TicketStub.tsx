import { useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, MapPin, Star, X } from "lucide-react";
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

/** Linha fina com uma estrela no meio — separa o título das
 * informações do evento, tudo ainda dentro da capa/gradiente. O
 * ingresso tem uma divisão só (a perfuração antes do canhoto); isto
 * aqui é decoração, não uma nova seção. */
export function TicketHeroDivider() {
  return (
    <div className="relative z-10 flex items-center gap-2 w-full max-w-[220px]">
      <div className="h-px flex-1 bg-white/25" />
      <Star size={9} className="text-white/50 fill-white/50 shrink-0" />
      <div className="h-px flex-1 bg-white/25" />
    </div>
  );
}

/** Data, hora e local em linha, direto sobre a capa/gradiente — como
 * no ingresso de referência, esses dados moram dentro da imagem, não
 * numa faixa escura à parte. */
export function TicketHeroMeta({
  dataHora,
  endereco,
}: {
  dataHora: string;
  endereco: string;
}) {
  const date = new Date(dataHora);
  return (
    <div className="relative z-10 flex items-start justify-center gap-5 text-white">
      <div className="flex items-center gap-1.5">
        <CalendarDays size={14} className="text-white/70 shrink-0" />
        <div className="text-left leading-tight">
          <p className="text-xs font-bold">{format(date, "dd/MM/yyyy")}</p>
          <p className="text-[10px] text-white/60 capitalize">{format(date, "EEEE", { locale: ptBR })}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock size={14} className="text-white/70 shrink-0" />
        <div className="text-left leading-tight">
          <p className="text-xs font-bold">{format(date, "HH:mm")}</p>
          <p className="text-[10px] text-white/60">horário</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 min-w-0 max-w-[110px]">
        <MapPin size={14} className="text-white/70 shrink-0" />
        <p className="text-xs font-bold text-left leading-tight line-clamp-2" title={endereco}>
          {endereco}
        </p>
      </div>
    </div>
  );
}

/** Confirmados, ainda dentro da capa: o anel de quórum (a assinatura
 * do Zuvio) ao lado de quem já confirmou. */
export function TicketHeroAttendance({
  quorum,
  confirmedLabel,
  rightSlot,
}: {
  quorum: QuorumSummary;
  /** "você confirmou" quando o próprio usuário é participante/dono do
   * evento; senão, cai para uma contagem genérica. */
  confirmedLabel: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex items-center gap-2.5">
      <QuorumMeter quorum={quorum} size={44} />
      <div className="text-left leading-tight">
        <p className="text-xs font-bold text-white">{confirmedLabel}</p>
        <p className="text-[11px] text-white/60">de {quorum.vagasTotal} confirmados</p>
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
  const [showQr, setShowQr] = useState(false);
  const code = `ZUV-${eventId.slice(0, 6).toUpperCase()}`;

  return (
    <>
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
            <button
              onClick={() => setShowQr(true)}
              className="bg-white p-1.5 rounded-md"
              aria-label="Ampliar QR code"
            >
              <QRCodeSVG value={shareUrl} size={54} bgColor="#ffffff" fgColor="#2A2013" />
            </button>
            <p className="font-mono text-[8px] tracking-[0.15em] text-paper-ink/45">
              Nº {ticketNumberFor(eventId)}
            </p>
          </div>
        </div>
      </div>

      {/* QR ampliado — clicar no código pequeno abre uma versão grande,
          fácil de ler por outro celular no check-in. Renderizado via
          portal pro `position: fixed` cobrir a viewport inteira, e não
          só o canhoto (que ganha um `transform` no hover). */}
      {showQr &&
        createPortal(
          <div
            className="fixed inset-0 bg-ink-950/80 flex items-center justify-center z-50 p-6"
            onClick={() => setShowQr(false)}
          >
            <div
              className="bg-paper-100 rounded-3xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between w-full">
                <p className="font-mono text-sm font-bold tracking-[0.1em] text-paper-ink">{code}</p>
                <button
                  onClick={() => setShowQr(false)}
                  className="text-paper-ink/50 hover:text-paper-ink"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={shareUrl} size={240} bgColor="#ffffff" fgColor="#2A2013" />
              </div>
              <p className="text-xs text-paper-ink/60 text-center">
                Aponte a câmera para fazer check-in ou compartilhar o evento.
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
