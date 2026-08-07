import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EventAdminRepository } from "../../infrastructure/supabase/repositories/EventAdminRepository";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";

/**
 * Regra de presença mínima + elegibilidade de certificado por
 * participante — elegibilidade é sempre recalculada na hora (ver
 * `get_certificate_eligibility`, migração 0042), nunca armazenada.
 */
export function useCertificates(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibilityQuery = useQuery({
    queryKey: ["certificate-eligibility", eventId],
    queryFn: () => EventAdminRepository.getCertificateEligibility(eventId!),
    enabled: Boolean(eventId),
  });

  const setPresencaMinima = useCallback(
    async (percentual: number | null) => {
      if (!eventId) return;
      setIsSavingRule(true);
      setError(null);
      try {
        await EventsRepository.update(eventId, { certificadoPresencaMinima: percentual });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
          queryClient.invalidateQueries({ queryKey: ["certificate-eligibility", eventId] }),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar a regra.");
      } finally {
        setIsSavingRule(false);
      }
    },
    [eventId, queryClient]
  );

  return {
    eligibility: eligibilityQuery.data ?? [],
    isLoading: eligibilityQuery.isLoading,
    isSavingRule,
    error,
    setPresencaMinima,
  };
}
