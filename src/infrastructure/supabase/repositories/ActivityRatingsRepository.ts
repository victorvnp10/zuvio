import { supabase } from "../client";
import { toActivityRating } from "../mappers";
import type { ActivityRating, ActivityRatingSummary } from "../../../domain/entities/types";

export const ActivityRatingsRepository = {
  async getMine(activityId: string, userId: string): Promise<ActivityRating | null> {
    const { data, error } = await supabase
      .from("activity_ratings")
      .select("*")
      .eq("activity_id", activityId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toActivityRating(data) : null;
  },

  /** Cria ou atualiza a avaliação — a pessoa pode mudar de ideia depois. */
  async upsert(activityId: string, userId: string, nota: number, comentario: string | null): Promise<ActivityRating> {
    const { data, error } = await supabase
      .from("activity_ratings")
      .upsert(
        { activity_id: activityId, user_id: userId, nota, comentario },
        { onConflict: "activity_id,user_id" }
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toActivityRating(data);
  },

  /** Média + contagem, sem expor avaliação individual de outra pessoa. */
  async getSummary(activityId: string): Promise<ActivityRatingSummary> {
    const { data, error } = await supabase.rpc("get_activity_rating_summary", {
      p_activity_id: activityId,
    });
    if (error) throw new Error(error.message);
    return { media: data.media, total: data.total };
  },
};
