import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";
import { CommitmentsRepository } from "../../infrastructure/supabase/repositories/CommitmentsRepository";
import { GoogleCalendarRepository } from "../../infrastructure/supabase/repositories/GoogleCalendarRepository";
import { summarizeQuorum } from "../../domain/services/QuorumService";
import {
  evaluateCheckinEligibility,
  CHECKIN_RADIUS_METERS,
} from "../../domain/valueObjects/Eligibility";
import { useAuth } from "../context/AuthContext";

/**
 * Hook de aplicação: carrega um evento, mantém em tempo real (via
 * Supabase Realtime) e expõe as ações de compromisso. A decisão de
 * negócio (quórum, elegibilidade de check-in) vem do domínio puro —
 * este hook só orquestra dados e chamadas de rede.
 */
export function useEventDetail(eventId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const eventQuery = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => EventsRepository.getById(eventId!),
    enabled: Boolean(eventId),
  });

  const commitmentsQuery = useQuery({
    queryKey: ["event-commitments", eventId],
    queryFn: () => CommitmentsRepository.listForEvent(eventId!),
    enabled: Boolean(eventId),
  });

  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = EventsRepository.subscribeToEvent(eventId, (updated) => {
      queryClient.setQueryData(["event", eventId], updated);
    });
    return unsubscribe;
  }, [eventId, queryClient]);

  const myCommitment = commitmentsQuery.data?.find((c) => c.userId === user?.id) ?? null;
  const quorum = eventQuery.data ? summarizeQuorum(eventQuery.data) : null;

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["event-commitments", eventId] });
  }, [eventId, queryClient]);

  const runAction = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      setActionError(null);
      setIsActing(true);
      try {
        await action();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
          queryClient.invalidateQueries({ queryKey: ["event-commitments", eventId] }),
        ]);
        return true;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Algo deu errado. Tente de novo.");
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [eventId, queryClient]
  );

  const handleCommit = useCallback(() => {
    if (!eventId) return Promise.resolve(false);
    return runAction(async () => {
      const commitment = await CommitmentsRepository.commit(eventId);
      // Sincronização com a Agenda do Google é "melhor esforço": se a
      // pessoa não conectou o Google, ou o token não tem mais
      // permissão, isso não deve impedir a confirmação de presença em
      // si — só registra o erro no console.
      GoogleCalendarRepository.syncEvent(commitment.id).catch((err) => {
        console.error("Não foi possível sincronizar com o Google Calendar:", err);
      });
    });
  }, [eventId, runAction]);

  const handleCancel = useCallback(() => {
    if (!eventId) return;
    return runAction(async () => {
      const commitmentId = myCommitment?.id;
      await CommitmentsRepository.cancel(eventId);
      if (commitmentId) {
        GoogleCalendarRepository.removeEvent(commitmentId).catch((err) => {
          console.error("Não foi possível remover o evento do Google Calendar:", err);
        });
      }
    });
  }, [eventId, runAction, myCommitment?.id]);

  const handleCheckin = useCallback(() => {
    if (!eventId || !eventQuery.data?.local.geo) return;

    return runAction(async () => {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
        });
      });

      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Validação otimista no cliente antes de gastar a chamada de rede
      // — a fonte da verdade (que não pode ser burlada) é a mesma
      // validação repetida dentro da função `checkin_event` no banco.
      const eligibility = evaluateCheckinEligibility({
        userLocation,
        eventLocation: eventQuery.data!.local.geo!,
        eventDateTimeISO: eventQuery.data!.dataHora,
        nowISO: new Date().toISOString(),
      });

      if (!eligibility.isEligible) {
        throw new Error(
          eligibility.isWithinRadius
            ? "Fora da janela de horário do check-in."
            : `Você está a ${Math.round(eligibility.distanceMeters)}m do local — precisa estar a até ${CHECKIN_RADIUS_METERS}m.`
        );
      }

      await CommitmentsRepository.checkin(eventId, userLocation.lat, userLocation.lng);
    });
  }, [eventId, eventQuery.data, runAction]);

  return {
    event: eventQuery.data ?? null,
    isLoading: eventQuery.isLoading,
    quorum,
    myCommitment,
    commitments: commitmentsQuery.data ?? [],
    isActing,
    actionError,
    handleCommit,
    handleCancel,
    handleCheckin,
    refetch,
  };
}
