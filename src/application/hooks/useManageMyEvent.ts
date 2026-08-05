import { useCallback, useState } from "react";
import { EventsRepository, type UpdateEventInput } from "../../infrastructure/supabase/repositories/EventsRepository";
import { GoogleCalendarRepository } from "../../infrastructure/supabase/repositories/GoogleCalendarRepository";
import type { EventProposal } from "../../domain/entities/types";

export function useManageMyEvent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEvent = useCallback(
    async (eventId: string, changes: UpdateEventInput): Promise<EventProposal | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const updated = await EventsRepository.update(eventId, changes);
        // Se data/local/título mudou, atualiza também o evento já
        // criado na agenda do organizador (melhor esforço).
        GoogleCalendarRepository.syncOrganizerEvent(eventId).catch((err) => {
          console.error("Não foi possível atualizar o Google Calendar:", err);
        });
        return updated;
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
      GoogleCalendarRepository.removeOrganizerEvent(eventId).catch((err) => {
        console.error("Não foi possível remover o evento do Google Calendar:", err);
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cancelar a proposta.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /** Exclusão de verdade — só permitido pela RLS enquanto o evento
   * ainda não atingiu o quórum (`status = 'aberto'`). */
  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      await EventsRepository.remove(eventId);
      GoogleCalendarRepository.removeOrganizerEvent(eventId).catch((err) => {
        console.error("Não foi possível remover o evento do Google Calendar:", err);
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a proposta.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { updateEvent, cancelEvent, deleteEvent, isSubmitting, error };
}
