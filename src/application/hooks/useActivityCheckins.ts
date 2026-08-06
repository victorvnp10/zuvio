import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivitiesRepository } from "../../infrastructure/supabase/repositories/ActivitiesRepository";
import {
  evaluateActivityCheckinEligibility,
  isWithinActivityCheckinWindow,
  CHECKIN_RADIUS_METERS,
} from "../../domain/valueObjects/Eligibility";
import { useAuth } from "../context/AuthContext";
import type { ConferenceActivity } from "../../domain/entities/types";

/** Check-in por atividade — espelha `useEventDetail.handleCheckin`
 * (geo quando a atividade tem coordenadas, só janela de horário
 * quando não tem), mas para várias atividades de uma vez, já que a
 * tela de programação lista todas juntas. */
export function useActivityCheckins(eventId: string | undefined, activities: ConferenceActivity[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activityIds = activities.map((a) => a.id);

  const query = useQuery({
    queryKey: ["activity-checkins", eventId, user?.id, activityIds.slice().sort().join(",")],
    queryFn: () => ActivitiesRepository.listMyCheckins(activityIds, user!.id),
    enabled: Boolean(user) && activityIds.length > 0,
  });

  const isCheckedIn = useCallback(
    (activityId: string) => (query.data ?? []).some((c) => c.activityId === activityId),
    [query.data]
  );

  const checkin = useCallback(
    async (activity: ConferenceActivity): Promise<boolean> => {
      setError(null);
      setCheckingInId(activity.id);
      try {
        let lat: number | null = null;
        let lng: number | null = null;

        if (activity.geo) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10_000,
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;

          const eligibility = evaluateActivityCheckinEligibility({
            userLocation: { lat, lng },
            activityLocation: activity.geo,
            activityStartISO: activity.dataHoraInicio,
            activityEndISO: activity.dataHoraFim,
            nowISO: new Date().toISOString(),
          });

          if (!eligibility.isEligible) {
            throw new Error(
              eligibility.isWithinRadius
                ? "Fora da janela de horário do check-in desta atividade."
                : `Você está a ${Math.round(eligibility.distanceMeters)}m do local — precisa estar a até ${CHECKIN_RADIUS_METERS}m.`
            );
          }
        } else if (
          !isWithinActivityCheckinWindow(activity.dataHoraInicio, activity.dataHoraFim, new Date().toISOString())
        ) {
          throw new Error("Fora da janela de horário do check-in desta atividade.");
        }

        await ActivitiesRepository.checkin(activity.id, lat, lng);
        await queryClient.invalidateQueries({ queryKey: ["activity-checkins", eventId] });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível fazer check-in.");
        return false;
      } finally {
        setCheckingInId(null);
      }
    },
    [eventId, queryClient]
  );

  return { isCheckedIn, checkin, checkingInId, error };
}
