import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { GoogleCalendarRepository } from "../../infrastructure/supabase/repositories/GoogleCalendarRepository";

export function useQuickCommit() {
  const queryClient = useQueryClient();
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidateFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["discovery-feed"] });
    queryClient.invalidateQueries({ queryKey: ["my-commitments"] });
  }, [queryClient]);

  const commit = useCallback(
    async (eventId: string) => {
      setPendingEventId(eventId);
      setError(null);
      try {
        const commitment = await CommitmentsRepository.commit(eventId);
        GoogleCalendarRepository.syncEvent(commitment.id).catch(() => {});
        invalidateFeed();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível confirmar presença.");
      } finally {
        setPendingEventId(null);
      }
    },
    [invalidateFeed]
  );

  const cancel = useCallback(
    async (eventId: string, commitmentId?: string) => {
      setPendingEventId(eventId);
      setError(null);
      try {
        await CommitmentsRepository.cancel(eventId);
        if (commitmentId) GoogleCalendarRepository.removeEvent(commitmentId).catch(() => {});
        invalidateFeed();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível cancelar.");
      } finally {
        setPendingEventId(null);
      }
    },
    [invalidateFeed]
  );

  return { commit, cancel, pendingEventId, error };
}
