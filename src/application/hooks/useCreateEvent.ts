import { useCallback, useState } from "react";
import { EventsRepository, type CreateEventInput } from "../../infrastructure/supabase/repositories/EventsRepository";
import { isValidQuorum } from "../../domain/services/QuorumService";
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

      setIsSubmitting(true);
      setError(null);
      try {
        return await EventsRepository.create({ ...input, criadorId: user.id });
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
