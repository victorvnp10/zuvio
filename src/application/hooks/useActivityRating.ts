import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityRatingsRepository } from "../../infrastructure/supabase/repositories/ActivityRatingsRepository";
import { useAuth } from "../context/AuthContext";

/** Avaliação (1-5 estrelas) de uma atividade — própria nota + média
 * pública. Uma instância por atividade (mesmo padrão de
 * `usePublicProfile` chamado por linha numa lista). */
export function useActivityRating(activityId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mineQuery = useQuery({
    queryKey: ["activity-rating-mine", activityId, user?.id],
    queryFn: () => ActivityRatingsRepository.getMine(activityId, user!.id),
    enabled: Boolean(user),
  });

  const summaryQuery = useQuery({
    queryKey: ["activity-rating-summary", activityId],
    queryFn: () => ActivityRatingsRepository.getSummary(activityId),
  });

  const rate = useCallback(
    async (nota: number, comentario?: string): Promise<boolean> => {
      if (!user) return false;
      setIsSubmitting(true);
      setError(null);
      try {
        await ActivityRatingsRepository.upsert(activityId, user.id, nota, comentario ?? null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["activity-rating-mine", activityId, user.id] }),
          queryClient.invalidateQueries({ queryKey: ["activity-rating-summary", activityId] }),
        ]);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a avaliação.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [activityId, user, queryClient]
  );

  return {
    myRating: mineQuery.data ?? null,
    summary: summaryQuery.data ?? null,
    rate,
    isSubmitting,
    error,
  };
}
