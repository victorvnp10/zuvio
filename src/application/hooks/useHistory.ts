import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../infrastructure/supabase/client";
import { toEventProposal } from "../../infrastructure/supabase/mappers";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { useAuth } from "../context/AuthContext";
import type { Commitment, EventProposal } from "../../domain/entities/types";

export interface HistoryEntry {
  commitment: Commitment;
  event: EventProposal;
}

/** Histórico de comparecimento: compromissos já resolvidos (check-in,
 * no-show, cancelado), ordenado pela DATA DO EVENTO (mais recente
 * primeiro) — não por quando o commitment foi tocado. Mesmo padrão de
 * `useMyEvents` (duas queries, junta no cliente). */
export function useHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["history", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<HistoryEntry[]> => {
      const resolved = await CommitmentsRepository.listMineResolved(user!.id);
      if (resolved.length === 0) return [];

      const eventIds = resolved.map((c) => c.eventId);
      const { data, error } = await supabase.from("events").select("*").in("id", eventIds);
      if (error) throw new Error(error.message);

      const events = (data ?? []).map(toEventProposal);
      return resolved
        .map((commitment) => {
          const event = events.find((e) => e.id === commitment.eventId);
          return event ? { commitment, event } : null;
        })
        .filter((entry): entry is HistoryEntry => entry !== null)
        .sort((a, b) => b.event.dataHora.localeCompare(a.event.dataHora));
    },
  });
}
