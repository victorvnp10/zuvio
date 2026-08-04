import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDiscoveryFeed } from "../../application/hooks/useDiscoveryFeed";
import { useQuickCommit } from "../../application/hooks/useQuickCommit";
import { useAuth } from "../../application/context/AuthContext";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { EventPostCard } from "../components/EventPostCard";
import { CATEGORY_OPTIONS, CATEGORY_COVER } from "../components/CategoryBadge";
import { BottomNav } from "../layout/BottomNav";
import type { EventCategory } from "../../domain/entities/types";

export function DiscoveryFeedScreen() {
  const { user } = useAuth();
  const [categoria, setCategoria] = useState<EventCategory | undefined>(undefined);
  const { data: events, isLoading } = useDiscoveryFeed(categoria);
  const { commit, cancel, pendingEventId, error } = useQuickCommit();

  const eventIds = useMemo(() => events?.map((e) => e.id) ?? [], [events]);

  const { data: allParticipants } = useQuery({
    queryKey: ["feed-participants", eventIds],
    queryFn: () => CommitmentsRepository.listForEvents(eventIds),
    enabled: eventIds.length > 0,
  });

  const { data: myCommitments } = useQuery({
    queryKey: ["my-commitments", user?.id],
    queryFn: () => CommitmentsRepository.listMine(user!.id),
    enabled: Boolean(user),
  });

  const participantsByEvent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of allParticipants ?? []) {
      map.set(c.eventId, [...(map.get(c.eventId) ?? []), c.userId]);
    }
    return map;
  }, [allParticipants]);

  const myCommitmentByEvent = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of myCommitments ?? []) {
      if (c.status !== "cancelado") map.set(c.eventId, c.id);
    }
    return map;
  }, [myCommitments]);

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 pb-16">
      <header className="sticky top-0 z-20 bg-ink-900/90 backdrop-blur-md border-b border-ink-800 px-4 py-3">
        <h1 className="font-display font-bold text-2xl">Zuvio</h1>
      </header>

      {/* Categorias em formato de "stories" */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-3 border-b border-ink-800">
        <button
          onClick={() => setCategoria(undefined)}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <span
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl bg-ink-800 ${
              !categoria ? "ring-2 ring-coral-500 ring-offset-2 ring-offset-ink-900" : ""
            }`}
          >
            ✨
          </span>
          <span className="text-[11px] text-ink-400">Todas</span>
        </button>
        {CATEGORY_OPTIONS.map((opt) => {
          const cover = CATEGORY_COVER[opt.value];
          const isActive = categoria === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setCategoria(opt.value)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <span
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl bg-gradient-to-br ${cover.gradient} ${
                  isActive ? "ring-2 ring-coral-500 ring-offset-2 ring-offset-ink-900" : ""
                }`}
              >
                {cover.emoji}
              </span>
              <span className="text-[11px] text-ink-400 truncate w-14 text-center">
                {opt.label.replace(/^[^\s]+\s/, "")}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading && <p className="text-center text-ink-400 py-10">Carregando propostas...</p>}

      {!isLoading && (events?.length ?? 0) === 0 && (
        <div className="text-center py-16 space-y-2 px-4">
          <p className="text-ink-200 font-medium">
            Nenhuma proposta por aqui ainda — que tal criar a primeira?
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-400 text-center py-2">{error}</p>}

      <div>
        {events?.map((event) => (
          <EventPostCard
            key={event.id}
            event={event}
            participantIds={participantsByEvent.get(event.id) ?? []}
            isCommitted={myCommitmentByEvent.has(event.id)}
            isOwnEvent={event.criadorId === user?.id}
            myCommitmentId={myCommitmentByEvent.get(event.id)}
            isPending={pendingEventId === event.id}
            onQuickCommit={() => commit(event.id)}
            onQuickCancel={() => cancel(event.id, myCommitmentByEvent.get(event.id))}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
