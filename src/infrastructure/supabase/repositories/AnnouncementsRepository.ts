import { supabase } from "../client";
import { toEventAnnouncement } from "../mappers";
import type { EventAnnouncement } from "../../../domain/entities/types";

export const AnnouncementsRepository = {
  async listForEvent(eventId: string): Promise<EventAnnouncement[]> {
    const { data, error } = await supabase
      .from("event_announcements")
      .select("*")
      .eq("event_id", eventId)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toEventAnnouncement);
  },

  async post(eventId: string, autorId: string, texto: string): Promise<EventAnnouncement> {
    const { data, error } = await supabase
      .from("event_announcements")
      .insert({ event_id: eventId, autor_id: autorId, texto })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toEventAnnouncement(data);
  },

  async remove(announcementId: string): Promise<void> {
    const { error } = await supabase.from("event_announcements").delete().eq("id", announcementId);
    if (error) throw new Error(error.message);
  },

  subscribeToAnnouncements(eventId: string, onNew: (announcement: EventAnnouncement) => void) {
    const channel = supabase
      .channel(`event-announcements-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_announcements",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => onNew(toEventAnnouncement(payload.new as never))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
