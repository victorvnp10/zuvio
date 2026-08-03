import { supabase } from "../client";
import { toCollaborativeItem } from "../mappers";
import type { CollaborativeItem } from "../../../domain/entities/types";

export const CollaborativeItemsRepository = {
  async listForEvent(eventId: string): Promise<CollaborativeItem[]> {
    const { data, error } = await supabase
      .from("collaborative_items")
      .select("*")
      .eq("event_id", eventId)
      .order("criado_em", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCollaborativeItem);
  },

  async addItem(eventId: string, nome: string, criadoPor: string): Promise<CollaborativeItem> {
    const { data, error } = await supabase
      .from("collaborative_items")
      .insert({ event_id: eventId, nome, criado_por: criadoPor })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toCollaborativeItem(data);
  },

  /** Marca "eu vou levar este item" (ou libera, se já era quem tinha marcado). */
  async toggleReserve(itemId: string, userId: string, currentlyReservedBy: string | null) {
    const novoValor = currentlyReservedBy === userId ? null : userId;
    const { error } = await supabase
      .from("collaborative_items")
      .update({ reservado_por: novoValor })
      .eq("id", itemId);
    if (error) throw new Error(error.message);
  },

  async removeItem(itemId: string): Promise<void> {
    const { error } = await supabase.from("collaborative_items").delete().eq("id", itemId);
    if (error) throw new Error(error.message);
  },
};
