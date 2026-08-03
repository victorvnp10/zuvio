import { supabase } from "../client";

export const ModerationRepository = {
  async reportUser(input: {
    denuncianteId: string;
    denunciadoId?: string | null;
    eventId?: string | null;
    motivo: string;
  }): Promise<void> {
    const { error } = await supabase.from("reports").insert({
      denunciante_id: input.denuncianteId,
      denunciado_id: input.denunciadoId ?? null,
      event_id: input.eventId ?? null,
      motivo: input.motivo,
    });
    if (error) throw new Error(error.message);
  },

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: blockerId, blocked_id: blockedId });
    if (error) throw new Error(error.message);
  },

  async listBlocked(blockerId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", blockerId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.blocked_id);
  },
};
