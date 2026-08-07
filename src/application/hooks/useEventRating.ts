import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EventRatingsRepository } from "../../infrastructure/supabase/repositories/EventRatingsRepository";
import { useAuth } from "../context/AuthContext";

/** Avaliação (1-5 estrelas + opinião) do evento como um todo — própria
 * nota + média pública. Mesmo padrão de `useActivityRating`. */
export function useEventRating(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mineQuery = useQuery({
    queryKey: ["event-rating-mine", eventId, user?.id],
    queryFn: () => EventRatingsRepository.getMine(eventId, user!.id),
    enabled: Boolean(user),
  });

  const summaryQuery = useQuery({
    queryKey: ["event-rating-summary", eventId],
    queryFn: () => EventRatingsRepository.getSummary(eventId),
  });

  const rate = useCallback(
    async (nota: number, comentario?: string): Promise<boolean> => {
      if (!user) return false;
      setIsSubmitting(true);
      setError(null);
      try {
        await EventRatingsRepository.upsert(eventId, user.id, nota, comentario ?? null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["event-rating-mine", eventId, user.id] }),
          queryClient.invalidateQueries({ queryKey: ["event-rating-summary", eventId] }),
        ]);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a avaliação.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [eventId, user, queryClient]
  );

  return {
    myRating: mineQuery.data ?? null,
    summary: summaryQuery.data ?? null,
    rate,
    isSubmitting,
    error,
  };
}
