import { useCallback, useState } from "react";
import { RatingsRepository } from "../../infrastructure/supabase/repositories/RatingsRepository";
import { useAuth } from "../context/AuthContext";

export function useSubmitRating(eventId: string) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRating = useCallback(
    async (avaliadoId: string, nota: number, comentario?: string) => {
      if (!user) return;
      setIsSubmitting(true);
      setError(null);
      try {
        await RatingsRepository.submit({
          eventId,
          avaliadorId: user.id,
          avaliadoId,
          nota,
          comentario,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a avaliação.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [eventId, user]
  );

  return { submitRating, isSubmitting, error };
}
