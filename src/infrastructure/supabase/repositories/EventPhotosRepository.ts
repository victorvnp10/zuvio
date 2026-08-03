import { supabase } from "../client";
import { toEventPhoto } from "../mappers";
import type { EventPhoto, FotoVisibilidade } from "../../../domain/entities/types";

export const EventPhotosRepository = {
  async listForEvent(eventId: string): Promise<EventPhoto[]> {
    const { data, error } = await supabase
      .from("event_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toEventPhoto);
  },

  async addPhoto(
    eventId: string,
    autorId: string,
    fotoUrl: string,
    visibilidade: FotoVisibilidade
  ): Promise<EventPhoto> {
    const { data, error } = await supabase
      .from("event_photos")
      .insert({ event_id: eventId, autor_id: autorId, foto_url: fotoUrl, visibilidade })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toEventPhoto(data);
  },

  async removePhoto(photoId: string): Promise<void> {
    const { error } = await supabase.from("event_photos").delete().eq("id", photoId);
    if (error) throw new Error(error.message);
  },
};
