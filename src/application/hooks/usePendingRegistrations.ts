import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";

/**
 * Inscrições pendentes de um evento (`exigeAprovacao = true`) — só o
 * organizador consegue chamar `list_pending_registrations` (RLS via
 * `security definer`, ver migração 0038). Aprovar/rejeitar invalida a
 * lista e o evento/commitments do resto do app, pra vagas/quórum
 * recalculados aparecerem sem precisar recarregar a página.
 */
export function usePendingRegistrations(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["pending-registrations", eventId],
    queryFn: () => CommitmentsRepository.listPending(eventId!),
    enabled: Boolean(eventId),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pending-registrations", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event-commitments", eventId] });
  }, [eventId, queryClient]);

  const approve = useCallback(
    async (commitmentId: string) => {
      setActingId(commitmentId);
      setError(null);
      try {
        await CommitmentsRepository.approve(commitmentId);
        invalidate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível aprovar a inscrição.");
      } finally {
        setActingId(null);
      }
    },
    [invalidate]
  );

  const reject = useCallback(
    async (commitmentId: string) => {
      setActingId(commitmentId);
      setError(null);
      try {
        await CommitmentsRepository.reject(commitmentId);
        invalidate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível rejeitar a inscrição.");
      } finally {
        setActingId(null);
      }
    },
    [invalidate]
  );

  return {
    pending: query.data ?? [],
    isLoading: query.isLoading,
    actingId,
    error,
    approve,
    reject,
  };
}
