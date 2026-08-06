import { useQuery } from "@tanstack/react-query";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { supabase } from "../../infrastructure/supabase/client";
import { toEventProposal } from "../../infrastructure/supabase/mappers";
import { useAuth } from "../context/AuthContext";

export function useMyEvents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-events", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [created, myCommitments] = await Promise.all([
        EventsRepository.listMine(user!.id),
        CommitmentsRepository.listMine(user!.id),
      ]);

      // 'no-show' (e 'cancelado') já aparecem no Histórico — aqui é só
      // o que ainda está em aberto ou já teve check-in de verdade.
      const committedEventIds = myCommitments
        .filter((c) => c.status === "confirmado" || c.status === "check-in")
        .map((c) => c.eventId)
        .filter((id) => !created.some((e) => e.id === id));

      if (committedEventIds.length === 0) {
        return { created, committed: [] };
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("id", committedEventIds);
      if (error) throw new Error(error.message);

      return { created, committed: (data ?? []).map(toEventProposal) };
    },
  });
}
