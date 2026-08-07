import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "../layout/AppShell";
import { useDiscoveryFeed } from "../../application/hooks/useDiscoveryFeed";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import { QuorumBar } from "../components/QuorumMeter";
import { CategoryBadge, CATEGORY_OPTIONS } from "../components/CategoryBadge";
import type { EventCategory } from "../../domain/entities/types";
import { MapPin, CalendarDays } from "lucide-react";

export function DiscoveryFeedScreen() {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState<EventCategory | undefined>(undefined);
  const { data: events, isLoading } = useDiscoveryFeed(categoria);

  return (
    <AppShell title="Descobrir">
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        <button
          onClick={() => setCategoria(undefined)}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            !categoria
              ? "bg-coral-500 border-coral-500 text-ink-950"
              : "bg-transparent border-ink-700 text-ink-300"
          }`}
        >
          Todas
        </button>
        {CATEGORY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setCategoria(opt.value)}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              categoria === opt.value
                ? "bg-coral-500 border-coral-500 text-ink-950"
                : "bg-transparent border-ink-700 text-ink-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-center text-ink-400 py-10">Carregando propostas...</p>}

      {!isLoading && (events?.length ?? 0) === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-ink-200 font-medium">
            Nenhuma proposta por aqui ainda — que tal criar a primeira?
          </p>
          <button
            onClick={() => navigate("/criar")}
            className="text-coral-500 font-semibold text-sm"
          >
            Criar proposta
          </button>
        </div>
      )}

      <div className="space-y-4 mt-2">
        {events?.map((event) => {
          const quorum = summarizeQuorum(event);
          return (
            <button
              key={event.id}
              onClick={() => navigate(`/eventos/${event.id}`)}
              className="w-full text-left bg-ink-800/60 border border-ink-700 rounded-2xl p-4 space-y-3 hover:border-coral-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CategoryBadge categoria={event.categoria} />
                  <h3 className="font-display font-semibold text-lg text-ink-100 mt-2">
                    {event.titulo}
                  </h3>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-sm text-ink-400">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {format(new Date(event.dataHora), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  {event.local.endereco}
                </span>
              </div>

              <QuorumBar quorum={quorum} />
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
