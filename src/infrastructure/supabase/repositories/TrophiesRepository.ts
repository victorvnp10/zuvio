import { supabase } from "../client";
import { toEarnedTrophy, toTrophy } from "../mappers";
import type { EarnedTrophy, Trophy } from "../../../domain/entities/types";

export const TrophiesRepository = {
  /** Catálogo completo — igual pra todo mundo, conquistado ou não. */
  async listCatalog(): Promise<Trophy[]> {
    const { data, error } = await supabase.from("trophies").select("*").order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toTrophy);
  },

  /** Troféus já conquistados por um perfil, com a data da conquista. */
  async listEarned(userId: string): Promise<EarnedTrophy[]> {
    const { data, error } = await supabase
      .from("profile_trophies")
      .select("conquistado_em, trophies(*)")
      .eq("profile_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map(
        (row) =>
          row as unknown as {
            conquistado_em: string;
            trophies: Parameters<typeof toTrophy>[0] | null;
          }
      )
      .filter((row): row is typeof row & { trophies: NonNullable<typeof row.trophies> } => Boolean(row.trophies))
      .map((row) => toEarnedTrophy(row.trophies, row.conquistado_em));
  },
};
