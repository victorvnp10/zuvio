import { useCallback, useState } from "react";
import { EventsRepository, type CreateEventInput } from "../../infrastructure/supabase/repositories/EventsRepository";
import { GoogleCalendarRepository } from "../../infrastructure/supabase/repositories/GoogleCalendarRepository";
import { isValidQuorum } from "../../domain/services/QuorumService";
import { validateEventType } from "../../domain/services/EventTypeService";
import { useAuth } from "../context/AuthContext";
import type { EventProposal } from "../../domain/entities/types";

export type CreateEventFormInput = Omit<CreateEventInput, "criadorId">;

export function useCreateEvent() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCallback(
    async (input: CreateEventFormInput): Promise<EventProposal | null> => {
      if (!user) {
        setError("Você precisa estar logado.");
        return null;
      }

      if (!isValidQuorum(input.quorumMinimo, input.vagasTotal)) {
        setError("O quórum mínimo não pode ser maior que o total de vagas.");
        return null;
      }

      const eventTypeError = validateEventType(input);
      if (eventTypeError) {
        setError(eventTypeError);
        return null;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        const event = await EventsRepository.create({ ...input, criadorId: user.id });
        // Melhor esforço: se a pessoa não conectou o Google, ou o
        // token não tem mais permissão, isso não deve impedir a
        // criação da proposta em si.
        GoogleCalendarRepository.syncOrganizerEvent(event.id).catch((err) => {
          console.error("Não foi possível sincronizar com o Google Calendar:", err);
        });
        return event;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível criar a proposta.");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user]
  );

  return { createEvent, isSubmitting, error };
}
