import { supabase } from "../client";

export const GoogleCalendarRepository = {
  async storeTokens(accessToken: string, refreshToken: string | undefined, expiresIn: number) {
    const { error } = await supabase.functions.invoke("sync-google-calendar", {
      body: {
        action: "store_tokens",
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
      },
    });
    if (error) throw new Error(error.message);
  },

  async syncEvent(commitmentId: string): Promise<{ synced: boolean; reason?: string }> {
    const { data, error } = await supabase.functions.invoke("sync-google-calendar", {
      body: { action: "sync_event", commitment_id: commitmentId },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async removeEvent(commitmentId: string): Promise<void> {
    const { error } = await supabase.functions.invoke("sync-google-calendar", {
      body: { action: "remove_event", commitment_id: commitmentId },
    });
    if (error) throw new Error(error.message);
  },
};
