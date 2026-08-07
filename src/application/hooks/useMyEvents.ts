import { useQuery } from "@tanstack/react-query";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { supabase } from "../../infrastructure/supabase/client";
import { toEventProposal } from "../../infrastructure/supabase/mappers";
import { useAuth } from "../context/AuthContext";
import type { EventProposal } from "../../domain/entities/types";

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

      // Inscrição enviada, aguardando o organizador aprovar (evento com
      // `exigeAprovacao`) — separado de "Confirmados" porque ainda não
      // é uma vaga de verdade.
      const pendingEventIds = myCommitments
        .filter((c) => c.status === "pendente")
        .map((c) => c.eventId)
        .filter((id) => !created.some((e) => e.id === id));

      const allIds = [...committedEventIds, ...pendingEventIds];
      if (allIds.length === 0) {
        return { created, committed: [], pending: [] };
      }

      const { data, error } = await supabase.from("events").select("*").in("id", allIds);
      if (error) throw new Error(error.message);

      const eventsById = new Map((data ?? []).map((row) => [row.id, toEventProposal(row)]));
      // Mesma ordem de `listMine` (ascendente por data) — o `.in(...)`
      // acima não garante ordem nenhuma, então precisa ordenar aqui.
      const resolve = (ids: string[]): EventProposal[] =>
        ids
          .map((id) => eventsById.get(id))
          .filter((e): e is EventProposal => Boolean(e))
          .sort((a, b) => a.dataHora.localeCompare(b.dataHora));

      return {
        created,
        committed: resolve(committedEventIds),
        pending: resolve(pendingEventIds),
      };
    },
  });
}
