import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Award, ArrowLeft, Check, Download, Star, Users } from "lucide-react";
import { useEventDetail } from "../../application/hooks/useEventDetail";
import { useAuth } from "../../application/context/AuthContext";
import { useEventAdminParticipants } from "../../application/hooks/useEventAdminParticipants";
import { useConferenceAdmin } from "../../application/hooks/useConferenceAdmin";
import { useCertificates } from "../../application/hooks/useCertificates";
import { EventRatingsRepository } from "../../infrastructure/supabase/repositories/EventRatingsRepository";
import { ConferenceAdminRepository } from "../../infrastructure/supabase/repositories/ConferenceAdminRepository";
import { PendingRegistrationsSection } from "../components/PendingRegistrationsSection";
import { Avatar } from "../components/Avatar";
import { buildCsv, triggerCsvDownload } from "../../shared/csv";
import { downloadCertificate, downloadCertificatesBatch } from "../../shared/certificatePdf";
import type { CommitmentStatus } from "../../domain/entities/types";

const STATUS_LABELS: Record<CommitmentStatus, string> = {
  confirmado: "Confirmado",
  "check-in": "Check-in",
  "no-show": "Não compareceu",
  cancelado: "Cancelado",
  pendente: "Pendente",
  rejeitado: "Rejeitado",
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
}

export function EventAdminScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { event, isLoading: isLoadingEvent } = useEventDetail(eventId);
  const { participants, isLoading: isLoadingParticipants, actingUserId, error, checkin } =
    useEventAdminParticipants(eventId);

  const isConference = event?.tipoEvento === "conferencia";
  const conferenceAdmin = useConferenceAdmin(isConference ? eventId : undefined);
  const activityIds = conferenceAdmin.activities.map((a) => a.id);

  const eventRatingsQuery = useQuery({
    queryKey: ["admin-event-ratings", eventId],
    queryFn: () => EventRatingsRepository.listForEvent(eventId!),
    enabled: Boolean(eventId),
  });

  const activityCheckinsQuery = useQuery({
    queryKey: ["admin-activity-checkin-rows", eventId, activityIds.slice().sort().join(",")],
    queryFn: () => ConferenceAdminRepository.getCheckinRows(activityIds),
    enabled: isConference && activityIds.length > 0,
  });

  const {
    eligibility,
    isLoading: isLoadingEligibility,
    isSavingRule,
    setPresencaMinima,
  } = useCertificates(eventId);
  const [presencaInput, setPresencaInput] = useState(100);
  const syncedRuleRef = useRef(false);

  useEffect(() => {
    if (!syncedRuleRef.current && event) {
      setPresencaInput(event.certificadoPresencaMinima ?? 100);
      syncedRuleRef.current = true;
    }
  }, [event]);

  if (isLoadingEvent || !event || !user) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-400">
        Carregando...
      </div>
    );
  }

  const isCreator = event.criadorId === user.id;
  if (!isCreator) {
    return <Navigate to={`/eventos/${eventId}`} replace />;
  }

  const nameById = new Map(participants.map((p) => [p.userId, p.nome]));
  const activityTitleById = new Map(conferenceAdmin.activities.map((a) => [a.id, a.titulo]));

  const confirmados = participants.filter((p) => p.status === "confirmado").length;
  const checkins = participants.filter((p) => p.status === "check-in").length;
  const noShows = participants.filter((p) => p.status === "no-show").length;
  const pendentes = participants.filter((p) => p.status === "pendente").length;
  const aguardandoCheckin = participants.filter((p) => p.status === "confirmado");
  const receitaEstimada = event.valorEntrada !== null ? (confirmados + checkins) * event.valorEntrada : null;

  const eventDateLabel = event.dataHoraFim
    ? `de ${format(new Date(event.dataHora), "dd 'de' MMMM", { locale: ptBR })} a ${format(
        new Date(event.dataHoraFim),
        "dd 'de' MMMM 'de' yyyy",
        { locale: ptBR }
      )}`
    : format(new Date(event.dataHora), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const eligiveis = eligibility.filter((e) => e.elegivel);

  const handleSaveRule = () => setPresencaMinima(presencaInput);

  const handleEmitOne = (nome: string, percentual: number) => {
    downloadCertificate({
      participantName: nome,
      eventTitle: event.titulo,
      eventDateLabel,
      attendancePercent: isConference ? percentual : undefined,
    });
  };

  const handleEmitBatch = () => {
    downloadCertificatesBatch(
      eligiveis.map((e) => ({
        participantName: e.nome,
        eventTitle: event.titulo,
        eventDateLabel,
        attendancePercent: isConference ? e.percentual : undefined,
      })),
      event.titulo
    );
  };

  const handleDownloadParticipants = () => {
    const header = ["Nome", "E-mail", "Status", "Confirmado em", "Check-in em"];
    const rows = participants.map((p) => [
      p.nome,
      p.email,
      STATUS_LABELS[p.status],
      new Date(p.confirmadoEm).toLocaleString("pt-BR"),
      p.checkinEm ? new Date(p.checkinEm).toLocaleString("pt-BR") : "",
    ]);
    triggerCsvDownload(buildCsv([header, ...rows]), `participantes-${slugify(event.titulo) || eventId}.csv`);
  };

  const handleDownloadEventRatings = () => {
    const header = ["Participante", "Nota", "Comentario", "Data"];
    const rows = (eventRatingsQuery.data ?? []).map((r) => [
      nameById.get(r.userId) ?? r.userId,
      String(r.nota),
      r.comentario ?? "",
      new Date(r.criadoEm).toLocaleString("pt-BR"),
    ]);
    triggerCsvDownload(buildCsv([header, ...rows]), `avaliacoes-evento-${slugify(event.titulo) || eventId}.csv`);
  };

  const handleDownloadActivitySummary = () => {
    const header = ["Atividade", "Check-ins", "Media avaliacao", "Total avaliacoes"];
    const rows = conferenceAdmin.summaries.map((s) => [
      s.titulo,
      String(s.checkins),
      s.mediaAvaliacao !== null ? s.mediaAvaliacao.toFixed(2) : "",
      String(s.totalAvaliacoes),
    ]);
    triggerCsvDownload(
      buildCsv([header, ...rows]),
      `atividades-resumo-${slugify(event.titulo) || eventId}.csv`
    );
  };

  const handleDownloadActivityCheckins = () => {
    const header = ["Atividade", "Participante", "Check-in em"];
    const rows = (activityCheckinsQuery.data ?? []).map((c) => [
      activityTitleById.get(c.activityId) ?? c.activityId,
      nameById.get(c.userId) ?? c.userId,
      new Date(c.checkinEm).toLocaleString("pt-BR"),
    ]);
    triggerCsvDownload(
      buildCsv([header, ...rows]),
      `atividades-participantes-${slugify(event.titulo) || eventId}.csv`
    );
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 pb-10">
      <header className="sticky top-0 z-20 bg-ink-900/85 backdrop-blur-md border-b border-ink-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/eventos/${eventId}`)} className="text-ink-300 hover:text-ink-100">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold truncate">Painel do organizador</h1>
          <p className="text-xs text-ink-500 truncate">{event.titulo}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
            <p className="text-2xl font-display font-bold">{confirmados + checkins}</p>
            <p className="text-xs text-ink-400 mt-0.5">Confirmados</p>
          </div>
          <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
            <p className="text-2xl font-display font-bold flex items-center gap-1.5">
              <Check size={18} className="text-quorum-500" /> {checkins}
            </p>
            <p className="text-xs text-ink-400 mt-0.5">Check-ins</p>
          </div>
          {pendentes > 0 && (
            <div className="bg-ink-800/60 border border-amber-500/30 rounded-2xl p-4">
              <p className="text-2xl font-display font-bold text-amber-500">{pendentes}</p>
              <p className="text-xs text-ink-400 mt-0.5">Pendentes</p>
            </div>
          )}
          {noShows > 0 && (
            <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
              <p className="text-2xl font-display font-bold text-ink-400">{noShows}</p>
              <p className="text-xs text-ink-400 mt-0.5">Não compareceram</p>
            </div>
          )}
          {receitaEstimada !== null && (
            <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
              <p className="text-2xl font-display font-bold">R$ {receitaEstimada.toFixed(2)}</p>
              <p className="text-xs text-ink-400 mt-0.5">Receita estimada</p>
            </div>
          )}
          <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
            <p className="text-2xl font-display font-bold flex items-center gap-1.5">
              <Star size={18} className="text-amber-500" />
              {eventRatingsQuery.data && eventRatingsQuery.data.length > 0
                ? (
                    eventRatingsQuery.data.reduce((sum, r) => sum + r.nota, 0) /
                    eventRatingsQuery.data.length
                  ).toFixed(1)
                : "—"}
            </p>
            <p className="text-xs text-ink-400 mt-0.5">
              Avaliação do evento ({eventRatingsQuery.data?.length ?? 0})
            </p>
          </div>
          {isConference && (
            <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
              <p className="text-2xl font-display font-bold flex items-center gap-1.5">
                <Users size={18} className="text-coral-500" />
                {conferenceAdmin.summaries.reduce((sum, s) => sum + s.checkins, 0)}
              </p>
              <p className="text-xs text-ink-400 mt-0.5">Check-ins em atividades</p>
            </div>
          )}
        </div>

        {/* Inscrições pendentes (Fase 2) */}
        {event.exigeAprovacao && eventId && <PendingRegistrationsSection eventId={eventId} />}

        {/* Check-in manual */}
        <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-semibold">Check-in</h2>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {isLoadingParticipants && <p className="text-sm text-ink-400">Carregando...</p>}
          {!isLoadingParticipants && aguardandoCheckin.length === 0 && (
            <p className="text-sm text-ink-500">
              Ninguém confirmado aguardando check-in — ou já fizeram sozinhos, ou ainda não
              chegou ninguém.
            </p>
          )}
          <div className="space-y-2">
            {aguardandoCheckin.map((p) => (
              <div
                key={p.commitmentId}
                className="flex items-center gap-3 bg-ink-900/40 border border-ink-700 rounded-xl p-3"
              >
                <Avatar fotoUrl={p.fotoUrl} nome={p.nome} size={32} />
                <p className="flex-1 min-w-0 text-sm text-ink-100 truncate">{p.nome}</p>
                <button
                  onClick={() => checkin(p.userId)}
                  disabled={actingUserId === p.userId}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-quorum-500/15 text-quorum-500 disabled:opacity-40 px-3 py-1.5 rounded-lg shrink-0"
                >
                  <Check size={13} /> Marcar check-in
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Conferência: acessos por atividade (já existia) */}
        {isConference && (
          <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-3">
            <h2 className="font-display font-semibold">Acessos por atividade</h2>
            {conferenceAdmin.isLoading && <p className="text-sm text-ink-400">Carregando...</p>}
            {!conferenceAdmin.isLoading && conferenceAdmin.summaries.length === 0 && (
              <p className="text-sm text-ink-500">Nenhuma atividade cadastrada ainda.</p>
            )}
            <div className="space-y-2">
              {conferenceAdmin.summaries.map((summary) => (
                <div
                  key={summary.activityId}
                  className="flex items-center justify-between bg-ink-900/40 border border-ink-700 rounded-xl p-3"
                >
                  <p className="text-sm font-medium text-ink-100 truncate flex-1 min-w-0 pr-3">
                    {summary.titulo}
                  </p>
                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <span className="flex items-center gap-1 text-ink-300">
                      <Users size={12} /> {summary.checkins}
                    </span>
                    <span className="flex items-center gap-1 text-ink-300">
                      <Star size={12} className="text-amber-500" />
                      {summary.mediaAvaliacao !== null ? summary.mediaAvaliacao.toFixed(1) : "—"}
                      {summary.totalAvaliacoes > 0 && (
                        <span className="text-ink-500">({summary.totalAvaliacoes})</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificados */}
        <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-semibold">Certificados</h2>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={presencaInput}
              onChange={(e) => setPresencaInput(Number(e.target.value))}
              className="w-16 bg-ink-900 border border-ink-700 rounded-lg px-2 py-1.5 text-sm text-ink-100 focus:border-coral-500 focus:outline-none"
            />
            <span className="text-xs text-ink-400 flex-1">
              % mínimo de presença{isConference ? " (por atividade)" : " (check-in no evento)"}
            </span>
            <button
              onClick={handleSaveRule}
              disabled={isSavingRule || presencaInput === (event.certificadoPresencaMinima ?? 100)}
              className="text-xs font-semibold text-coral-500 disabled:opacity-40 shrink-0"
            >
              Salvar
            </button>
          </div>

          {isLoadingEligibility && <p className="text-sm text-ink-400">Carregando...</p>}
          {!isLoadingEligibility && eligibility.length === 0 && (
            <p className="text-sm text-ink-500">Ninguém confirmado/check-in ainda pra calcular elegibilidade.</p>
          )}

          <div className="space-y-2">
            {eligibility.map((e) => (
              <div
                key={e.userId}
                className="flex items-center justify-between gap-3 bg-ink-900/40 border border-ink-700 rounded-xl p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-100 truncate">{e.nome}</p>
                  <p className={`text-xs ${e.elegivel ? "text-quorum-500" : "text-ink-500"}`}>
                    {e.percentual.toFixed(0)}% de presença {e.elegivel ? "· elegível" : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleEmitOne(e.nome, e.percentual)}
                  disabled={!e.elegivel}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-ink-700 disabled:opacity-30 text-ink-100 px-3 py-1.5 rounded-lg shrink-0"
                >
                  <Award size={13} /> Emitir
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleEmitBatch}
            disabled={eligiveis.length === 0}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-coral-500 disabled:opacity-40 text-ink-950 px-3 py-2.5 rounded-lg"
          >
            <Award size={15} /> Emitir todos os elegíveis ({eligiveis.length})
          </button>
        </div>

        {/* Downloads */}
        <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-2">
          <h2 className="font-display font-semibold mb-1">Downloads</h2>
          <button
            onClick={handleDownloadParticipants}
            disabled={participants.length === 0}
            className="w-full flex items-center gap-2 text-sm font-semibold bg-ink-700 disabled:opacity-40 text-ink-100 px-3 py-2.5 rounded-lg"
          >
            <Download size={14} /> Lista de participantes
          </button>
          <button
            onClick={handleDownloadEventRatings}
            disabled={!eventRatingsQuery.data || eventRatingsQuery.data.length === 0}
            className="w-full flex items-center gap-2 text-sm font-semibold bg-ink-700 disabled:opacity-40 text-ink-100 px-3 py-2.5 rounded-lg"
          >
            <Download size={14} /> Avaliações do evento
          </button>
          {isConference && (
            <>
              <button
                onClick={handleDownloadActivitySummary}
                disabled={conferenceAdmin.summaries.length === 0}
                className="w-full flex items-center gap-2 text-sm font-semibold bg-ink-700 disabled:opacity-40 text-ink-100 px-3 py-2.5 rounded-lg"
              >
                <Download size={14} /> Resumo por atividade
              </button>
              <button
                onClick={handleDownloadActivityCheckins}
                disabled={!activityCheckinsQuery.data || activityCheckinsQuery.data.length === 0}
                className="w-full flex items-center gap-2 text-sm font-semibold bg-ink-700 disabled:opacity-40 text-ink-100 px-3 py-2.5 rounded-lg"
              >
                <Download size={14} /> Lista completa por atividade
              </button>
              <button
                onClick={() => triggerCsvDownload(conferenceAdmin.buildRatingsCsv(), `avaliacoes-atividades-${slugify(event.titulo) || eventId}.csv`)}
                disabled={conferenceAdmin.totalRatings === 0}
                className="w-full flex items-center gap-2 text-sm font-semibold bg-ink-700 disabled:opacity-40 text-ink-100 px-3 py-2.5 rounded-lg"
              >
                <Download size={14} /> Avaliações por atividade
              </button>
            </>
          )}
          <p className="text-xs text-ink-500 pt-1">
            Todos os arquivos abrem prontos em planilha (Excel/Sheets), acentuação incluída.
          </p>
        </div>
      </main>
    </div>
  );
}
