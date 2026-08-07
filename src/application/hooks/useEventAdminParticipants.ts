import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EventAdminRepository } from "../../infrastructure/supabase/repositories/EventAdminRepository";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";

/**
 * Roster completo do evento (qualquer status, com e-mail — só o
 * organizador consegue chamar) + check-in manual. Usado nas abas de
 * Check-in, Estatísticas e Downloads do painel do administrador.
 */
export function useEventAdminParticipants(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-participants", eventId],
    queryFn: () => EventAdminRepository.listParticipants(eventId!),
    enabled: Boolean(eventId),
  });

  const checkin = useCallback(
    async (userId: string) => {
      if (!eventId) return;
      setActingUserId(userId);
      setError(null);
      try {
        await CommitmentsRepository.adminCheckin(eventId, userId);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin-participants", eventId] }),
          queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível fazer o check-in.");
      } finally {
        setActingUserId(null);
      }
    },
    [eventId, queryClient]
  );

  return {
    participants: query.data ?? [],
    isLoading: query.isLoading,
    actingUserId,
    error,
    checkin,
  };
}
