import { supabase } from "../client";
import { toRating } from "../mappers";
import type { Rating } from "../../../domain/entities/types";

export const RatingsRepository = {
  async listForEvent(eventId: string): Promise<Rating[]> {
    const { data, error } = await supabase.from("ratings").select("*").eq("event_id", eventId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toRating);
  },

  async submit(input: {
    eventId: string;
    avaliadorId: string;
    avaliadoId: string;
    nota: number;
    comentario?: string | null;
  }): Promise<Rating> {
    const { data, error } = await supabase
      .from("ratings")
      .insert({
        event_id: input.eventId,
        avaliador_id: input.avaliadorId,
        avaliado_id: input.avaliadoId,
        nota: input.nota,
        comentario: input.comentario ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toRating(data);
  },
};
