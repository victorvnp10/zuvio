import { useCallback, useState } from "react";
import { ModerationRepository } from "../../infrastructure/supabase/repositories/ModerationRepository";
import { useAuth } from "../context/AuthContext";

export function useModeration() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportUser = useCallback(
    async (motivo: string, opts: { denunciadoId?: string; eventId?: string } = {}) => {
      if (!user) return;
      setIsSubmitting(true);
      setError(null);
      try {
        await ModerationRepository.reportUser({
          denuncianteId: user.id,
          denunciadoId: opts.denunciadoId,
          eventId: opts.eventId,
          motivo,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a denúncia.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [user]
  );

  const blockUser = useCallback(
    async (blockedId: string) => {
      if (!user) return;
      setIsSubmitting(true);
      setError(null);
      try {
        await ModerationRepository.blockUser(user.id, blockedId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível bloquear.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [user]
  );

  return { reportUser, blockUser, isSubmitting, error };
}
