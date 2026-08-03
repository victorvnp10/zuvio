import { useCallback, useState } from "react";
import { EventsRepository, type UpdateEventInput } from "../../infrastructure/supabase/repositories/EventsRepository";
import type { EventProposal } from "../../domain/entities/types";

export function useManageMyEvent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEvent = useCallback(
    async (eventId: string, changes: UpdateEventInput): Promise<EventProposal | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await EventsRepository.update(eventId, changes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar as alterações.");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const cancelEvent = useCallback(async (eventId: string): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      await EventsRepository.cancel(eventId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cancelar a proposta.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { updateEvent, cancelEvent, isSubmitting, error };
}
