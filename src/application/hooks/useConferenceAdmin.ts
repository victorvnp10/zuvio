import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConferenceActivities } from "./useConferenceActivities";
import { ConferenceAdminRepository } from "../../infrastructure/supabase/repositories/ConferenceAdminRepository";
import { buildCsv } from "../../shared/csv";

export interface ActivityAdminSummary {
  activityId: string;
  titulo: string;
  checkins: number;
  mediaAvaliacao: number | null;
  totalAvaliacoes: number;
}

export function useConferenceAdmin(eventId: string | undefined) {
  const { data: activities, isLoading: isLoadingActivities } = useConferenceActivities(eventId);
  const activityIds = useMemo(() => (activities ?? []).map((a) => a.id), [activities]);

  const checkinCountsQuery = useQuery({
    queryKey: ["conference-admin-checkin-counts", eventId, activityIds.slice().sort().join(",")],
    queryFn: () => ConferenceAdminRepository.getCheckinCounts(activityIds),
    enabled: activityIds.length > 0,
  });

  const ratingsQuery = useQuery({
    queryKey: ["conference-admin-ratings", eventId, activityIds.slice().sort().join(",")],
    queryFn: () => ConferenceAdminRepository.getAllRatings(activityIds),
    enabled: activityIds.length > 0,
  });

  const raterIds = useMemo(
    () => (ratingsQuery.data ?? []).map((r) => r.userId),
    [ratingsQuery.data]
  );

  const profilesQuery = useQuery({
    queryKey: ["conference-admin-rater-profiles", eventId, raterIds.slice().sort().join(",")],
    queryFn: () => ConferenceAdminRepository.getProfilesByIds(raterIds),
    enabled: raterIds.length > 0,
  });

  const summaries: ActivityAdminSummary[] = useMemo(() => {
    const checkinCounts = checkinCountsQuery.data ?? {};
    const ratings = ratingsQuery.data ?? [];

    return (activities ?? []).map((activity) => {
      const activityRatings = ratings.filter((r) => r.activityId === activity.id);
      const totalAvaliacoes = activityRatings.length;
      const mediaAvaliacao =
        totalAvaliacoes > 0
          ? Math.round((activityRatings.reduce((sum, r) => sum + r.nota, 0) / totalAvaliacoes) * 100) / 100
          : null;

      return {
        activityId: activity.id,
        titulo: activity.titulo,
        checkins: checkinCounts[activity.id] ?? 0,
        mediaAvaliacao,
        totalAvaliacoes,
      };
    });
  }, [activities, checkinCountsQuery.data, ratingsQuery.data]);

  /** Uma linha por avaliação — pronta pra abrir em planilha ou colar
   * numa IA analisar em lote. */
  const buildRatingsCsv = (): string => {
    const activityTitleById = new Map((activities ?? []).map((a) => [a.id, a.titulo]));
    const profiles = profilesQuery.data ?? {};

    const header = ["Atividade", "Participante", "Nota", "Comentario", "Data"];
    const rows = (ratingsQuery.data ?? []).map((rating) => [
      activityTitleById.get(rating.activityId) ?? rating.activityId,
      profiles[rating.userId]?.nome ?? rating.userId,
      String(rating.nota),
      rating.comentario ?? "",
      new Date(rating.criadoEm).toLocaleString("pt-BR"),
    ]);

    return buildCsv([header, ...rows]);
  };

  return {
    activities: activities ?? [],
    summaries,
    isLoading: isLoadingActivities || checkinCountsQuery.isLoading || ratingsQuery.isLoading,
    buildRatingsCsv,
    totalRatings: (ratingsQuery.data ?? []).length,
  };
}
