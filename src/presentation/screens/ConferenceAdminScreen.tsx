import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Star, Users } from "lucide-react";
import { useEventDetail } from "../../application/hooks/useEventDetail";
import { useConferenceAdmin } from "../../application/hooks/useConferenceAdmin";
import { useAuth } from "../../application/context/AuthContext";

function triggerCsvDownload(csv: string, filename: string) {
  // BOM (﻿) na frente — sem isso o Excel abre acentuação em UTF-8
  // (nome de atividade/comentário) toda quebrada.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ConferenceAdminScreen() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { event, isLoading: isLoadingEvent } = useEventDetail(eventId);
  const { summaries, isLoading: isLoadingAdmin, buildRatingsCsv, totalRatings } = useConferenceAdmin(eventId);

  if (isLoadingEvent || !event || !user) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-400">
        Carregando...
      </div>
    );
  }

  const isCreator = event.criadorId === user.id;
  if (event.tipoEvento !== "conferencia" || !isCreator) {
    navigate(`/eventos/${eventId}`, { replace: true });
    return null;
  }

  const totalCheckins = summaries.reduce((sum, s) => sum + s.checkins, 0);

  const handleExport = () => {
    if (!eventId) return;
    const csv = buildRatingsCsv();
    const slug = event.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    triggerCsvDownload(csv, `avaliacoes-${slug || eventId}.csv`);
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 pb-10">
      <header className="sticky top-0 z-20 bg-ink-900/85 backdrop-blur-md border-b border-ink-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/eventos/${eventId}`)} className="text-ink-300 hover:text-ink-100">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold truncate">Painel da conferência</h1>
          <p className="text-xs text-ink-500 truncate">{event.titulo}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
            <p className="text-2xl font-display font-bold flex items-center gap-1.5">
              <Users size={18} className="text-coral-500" /> {totalCheckins}
            </p>
            <p className="text-xs text-ink-400 mt-0.5">Check-ins no total</p>
          </div>
          <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
            <p className="text-2xl font-display font-bold flex items-center gap-1.5">
              <Star size={18} className="text-amber-500" /> {totalRatings}
            </p>
            <p className="text-xs text-ink-400 mt-0.5">Avaliações recebidas</p>
          </div>
        </div>

        <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Acessos por atividade</h2>
            <button
              onClick={handleExport}
              disabled={totalRatings === 0}
              className="flex items-center gap-1.5 text-xs font-semibold bg-ink-700 disabled:opacity-40 text-ink-100 px-3 py-1.5 rounded-lg"
            >
              <Download size={13} /> Exportar CSV
            </button>
          </div>

          {isLoadingAdmin && <p className="text-sm text-ink-400">Carregando...</p>}

          {!isLoadingAdmin && summaries.length === 0 && (
            <p className="text-sm text-ink-500">Nenhuma atividade cadastrada ainda.</p>
          )}

          <div className="space-y-2">
            {summaries.map((summary) => (
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

          <p className="text-xs text-ink-500">
            A exportação inclui uma linha por avaliação (atividade, participante, nota, comentário e
            data) — pronta pra colar numa planilha ou analisar em lote.
          </p>
        </div>
      </main>
    </div>
  );
}
