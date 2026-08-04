import { supabase } from "../client";

export const EventLikesRepository = {
  async listLikerIds(eventId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("event_likes")
      .select("user_id")
      .eq("event_id", eventId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.user_id);
  },

  /** Curtidas de vários eventos de uma vez — usado no feed. */
  async listForEvents(eventIds: string[]): Promise<{ eventId: string; userId: string }[]> {
    if (eventIds.length === 0) return [];
    const { data, error } = await supabase
      .from("event_likes")
      .select("event_id, user_id")
      .in("event_id", eventIds);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({ eventId: row.event_id, userId: row.user_id }));
  },

  async like(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase.from("event_likes").insert({ event_id: eventId, user_id: userId });
    if (error) throw new Error(error.message);
  },

  async unlike(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("event_likes")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },
};
