import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "../layout/AppShell";
import { useMyEvents } from "../../application/hooks/useMyEvents";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { QuorumBar } from "../components/QuorumMeter";
import { CategoryBadge } from "../components/CategoryBadge";
import type { EventProposal } from "../../domain/entities/types";

function EventRow({ event, onClick }: { event: EventProposal; onClick: () => void }) {
  const quorum = summarizeQuorum(event);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-ink-800/60 border border-ink-700 rounded-2xl p-4 space-y-2 hover:border-coral-500/40 transition-colors"
    >
      <CategoryBadge categoria={event.categoria} />
      <h3 className="font-display font-semibold text-ink-100">{event.titulo}</h3>
      <p className="text-xs text-ink-400">
        {format(new Date(event.dataHora), "dd/MM 'às' HH:mm", { locale: ptBR })}
      </p>
      <QuorumBar quorum={quorum} />
    </button>
  );
}

export function MyEventsScreen() {
  const navigate = useNavigate();
  const { data, isLoading } = useMyEvents();

  return (
    <AppShell title="Meus Eventos">
      {isLoading && <p className="text-ink-400">Carregando...</p>}

      {!isLoading && (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-ink-400 mb-2 uppercase tracking-wide">
              Criados por mim
            </h2>
            {data?.created.length === 0 && (
              <p className="text-sm text-ink-500">Você ainda não criou nenhuma proposta.</p>
            )}
            <div className="space-y-3">
              {data?.created.map((event) => (
                <EventRow key={event.id} event={event} onClick={() => navigate(`/eventos/${event.id}`)} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-ink-400 mb-2 uppercase tracking-wide">
              Confirmados
            </h2>
            {data?.committed.length === 0 && (
              <p className="text-sm text-ink-500">Nenhum compromisso confirmado ainda.</p>
            )}
            <div className="space-y-3">
              {data?.committed.map((event) => (
                <EventRow key={event.id} event={event} onClick={() => navigate(`/eventos/${event.id}`)} />
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
