import { supabase } from "../client";

export const AnalyticsRepository = {
  /** Grava um evento de uso. Silencioso em caso de erro — analytics
   * nunca deve quebrar (nem só atrapalhar) a experiência real do app. */
  async track(userId: string, sessionId: string, tipo: "session_start" | "page_view" | "heartbeat", path?: string): Promise<void> {
    await supabase
      .from("analytics_events")
      .insert({ user_id: userId, session_id: sessionId, tipo, path: path ?? null })
      .then(({ error }) => {
        if (error) console.warn("[analytics] falha ao registrar evento:", error.message);
      });
  },
};
