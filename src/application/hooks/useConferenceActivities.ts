import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivitiesRepository, type ActivityInput } from "../../infrastructure/supabase/repositories/ActivitiesRepository";
import type { ConferenceActivity } from "../../domain/entities/types";

/** CRUD da programação de uma conferência — RLS já garante que só o
 * organizador consegue criar/editar/remover (ver migração 0033), então
 * este hook não precisa checar `isCreator` de novo antes de chamar. */
export function useConferenceActivities(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["conference-activities", eventId],
    queryFn: () => ActivitiesRepository.listForEvent(eventId!),
    enabled: Boolean(eventId),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["conference-activities", eventId] });
  }, [queryClient, eventId]);

  const createActivity = useCallback(
    async (input: ActivityInput): Promise<ConferenceActivity | null> => {
      if (!eventId) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const activity = await ActivitiesRepository.create(eventId, input);
        invalidate();
        return activity;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível criar a atividade.");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [eventId, invalidate]
  );

  const updateActivity = useCallback(
    async (activityId: string, input: Partial<ActivityInput>): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        await ActivitiesRepository.update(activityId, input);
        invalidate();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar a atividade.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [invalidate]
  );

  const removeActivity = useCallback(
    async (activityId: string): Promise<boolean> => {
      setError(null);
      try {
        await ActivitiesRepository.remove(activityId);
        invalidate();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível remover a atividade.");
        return false;
      }
    },
    [invalidate]
  );

  return { ...query, createActivity, updateActivity, removeActivity, isSubmitting, error };
}
