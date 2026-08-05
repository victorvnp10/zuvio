import { supabase } from "../client";
import { toEventPhoto } from "../mappers";
import type { EventPhoto } from "../../../domain/entities/types";

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

  /** Fotos de vários eventos de uma vez — usado no feed principal
   * pro carrossel "reels" da capa. A RLS já filtra sozinha: só volta
   * foto de evento com `fotos_publicas = true` (os outros vêm vazios
   * pra quem não participa), sem precisar checar a flag aqui. */
  async listForEvents(eventIds: string[]): Promise<Record<string, EventPhoto[]>> {
    if (eventIds.length === 0) return {};
    const { data, error } = await supabase
      .from("event_photos")
      .select("*")
      .in("event_id", eventIds)
      .order("criado_em", { ascending: true });
    if (error) throw new Error(error.message);

    const byEvent: Record<string, EventPhoto[]> = {};
    for (const row of (data ?? []).map(toEventPhoto)) {
      byEvent[row.eventId] = [...(byEvent[row.eventId] ?? []), row];
    }
    return byEvent;
  },

  /** Visibilidade não é mais escolha de quem posta — é decisão do
   * organizador, no nível do evento (`events.fotos_publicas`). A
   * coluna `visibilidade` da foto continua existindo no banco por
   * compatibilidade, mas a permissão de leitura ignora esse valor. */
  async addPhoto(eventId: string, autorId: string, fotoUrl: string): Promise<EventPhoto> {
    const { data, error } = await supabase
      .from("event_photos")
      .insert({ event_id: eventId, autor_id: autorId, foto_url: fotoUrl })
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
