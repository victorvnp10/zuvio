import { supabase } from "../client";
import { toActivityRating, toProfile } from "../mappers";
import type { ActivityRating, Profile } from "../../../domain/entities/types";

export const ConferenceAdminRepository = {
  /** Quantos check-ins cada atividade recebeu — a mesma linha da RLS
   * que deixa o organizador ver todos os check-ins das próprias
   * atividades (ver migração 0034) alimenta essa contagem, sem
   * precisar de nenhuma função nova. */
  async getCheckinCounts(activityIds: string[]): Promise<Record<string, number>> {
    if (activityIds.length === 0) return {};
    const { data, error } = await supabase
      .from("activity_checkins")
      .select("activity_id")
      .in("activity_id", activityIds);
    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.activity_id] = (counts[row.activity_id] ?? 0) + 1;
    }
    return counts;
  },

  /** Todas as avaliações das atividades de uma conferência (organizador
   * enxerga tudo via RLS, não só a própria) — base tanto do resumo por
   * atividade quanto da exportação em lote. */
  async getAllRatings(activityIds: string[]): Promise<ActivityRating[]> {
    if (activityIds.length === 0) return [];
    const { data, error } = await supabase
      .from("activity_ratings")
      .select("*")
      .in("activity_id", activityIds)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toActivityRating);
  },

  /** Nomes dos participantes que avaliaram — só pra rotular a
   * exportação (o organizador já vê essas notas/comentários via RLS;
   * isso não abre nenhum dado que ele não víssemos antes). */
  async getProfilesByIds(userIds: string[]): Promise<Record<string, Profile>> {
    if (userIds.length === 0) return {};
    const { data, error } = await supabase
      .from("public_profiles")
      .select("*")
      .in("id", Array.from(new Set(userIds)));
    if (error) throw new Error(error.message);

    const byId: Record<string, Profile> = {};
    for (const row of data ?? []) {
      const profile = toProfile(row);
      byId[profile.id] = profile;
    }
    return byId;
  },
};
