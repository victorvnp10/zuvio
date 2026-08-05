import { supabase } from "../client";
import { toChatMessage } from "../mappers";
import type { ChatMessage } from "../../../domain/entities/types";

export const ChatRepository = {
  async listMessages(eventId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("event_id", eventId)
      .order("criado_em", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toChatMessage);
  },

  async sendMessage(eventId: string, autorId: string, texto: string): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ event_id: eventId, autor_id: autorId, texto })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toChatMessage(data);
  },

  /** Assina novas mensagens em tempo real (Supabase Realtime). */
  subscribeToMessages(eventId: string, onMessage: (message: ChatMessage) => void) {
    const channel = supabase
      .channel(`chat-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `event_id=eq.${eventId}` },
        (payload) => onMessage(toChatMessage(payload.new as never))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
