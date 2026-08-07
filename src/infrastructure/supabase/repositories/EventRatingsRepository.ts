import { supabase } from "../client";
import { toEventRating } from "../mappers";
import type { EventRating, EventRatingSummary } from "../../../domain/entities/types";

export const EventRatingsRepository = {
  async getMine(eventId: string, userId: string): Promise<EventRating | null> {
    const { data, error } = await supabase
      .from("event_ratings")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toEventRating(data) : null;
  },

  /** Cria ou atualiza a avaliação — a pessoa pode mudar de ideia depois. */
  async upsert(
    eventId: string,
    userId: string,
    nota: number,
    comentario: string | null
  ): Promise<EventRating> {
    const { data, error } = await supabase
      .from("event_ratings")
      .upsert({ event_id: eventId, user_id: userId, nota, comentario }, { onConflict: "event_id,user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toEventRating(data);
  },

  /** Média + contagem, sem expor avaliação individual de outra pessoa. */
  async getSummary(eventId: string): Promise<EventRatingSummary> {
    const { data, error } = await supabase.rpc("get_event_rating_summary", { p_event_id: eventId });
    if (error) throw new Error(error.message);
    return { media: data.media, total: data.total };
  },
};
