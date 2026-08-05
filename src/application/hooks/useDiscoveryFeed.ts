import { useQuery } from "@tanstack/react-query";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { FriendsRepository } from "../../infrastructure/supabase/repositories/FriendsRepository";
import { computeSocialProximityScore } from "../../domain/services/FeedRankingService";
import { useAuth } from "../context/AuthContext";
import type { EventCategory } from "../../domain/entities/types";

/**
 * Feed de descoberta, ordenado por proximidade social: eventos de
 * amigos primeiro, depois eventos onde algum amigo já confirmou
 * presença, depois o restante. A privacidade de cada evento já foi
 * decidida antes disso, na política de RLS (quem não pode ver um
 * evento Restrito/Amigos nem recebe a linha do banco) — isto só
 * ordena o que a pessoa já tem permissão de ver.
 */
export function useDiscoveryFeed(categoria?: EventCategory) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["discovery-feed", categoria ?? "todas", user?.id],
    enabled: Boolean(user),
    staleTime: 30_000,
    queryFn: async () => {
      const [events, friendships] = await Promise.all([
        EventsRepository.listDiscoveryFeed({ categoria }),
        FriendsRepository.listFriendships(user!.id),
      ]);

      const friendIds = new Set(
        friendships.map((f) => (f.requesterId === user!.id ? f.addresseeId : f.requesterId))
      );

      if (friendIds.size === 0 || events.length === 0) {
        return events;
      }

      const commitmentsByFriends = await CommitmentsRepository.listForEventsAndUsers(
        events.map((e) => e.id),
        Array.from(friendIds)
      );

      const friendParticipantsByEvent = new Map<string, string[]>();
      for (const c of commitmentsByFriends) {
        const list = friendParticipantsByEvent.get(c.eventId) ?? [];
        list.push(c.userId);
        friendParticipantsByEvent.set(c.eventId, list);
      }

      return [...events].sort((a, b) => {
        const scoreA = computeSocialProximityScore({
          criadorId: a.criadorId,
          participantIds: friendParticipantsByEvent.get(a.id) ?? [],
          friendIds,
        });
        const scoreB = computeSocialProximityScore({
          criadorId: b.criadorId,
          participantIds: friendParticipantsByEvent.get(b.id) ?? [],
          friendIds,
        });
        if (scoreB !== scoreA) return scoreB - scoreA;
        // Empate na proximidade social: mantém a ordem por data (já vem assim do backend).
        return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
      });
    },
  });
}
