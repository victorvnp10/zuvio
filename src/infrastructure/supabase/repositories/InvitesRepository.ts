import { supabase } from "../client";

export const InvitesRepository = {
  async create(input: {
    eventId: string;
    criadoPor: string;
    uso: "unico" | "multiplo";
    expiraEmISO: string | null;
  }): Promise<{ codigo: string }> {
    const { data, error } = await supabase
      .from("invites")
      .insert({
        event_id: input.eventId,
        criado_por: input.criadoPor,
        uso: input.uso,
        expira_em: input.expiraEmISO,
      })
      .select("codigo")
      .single();
    if (error) throw new Error(error.message);
    return { codigo: data.codigo };
  },

  /** Retorna o event_id do convite resgatado. */
  async redeem(codigo: string): Promise<string> {
    const { data, error } = await supabase.rpc("redeem_invite", { p_codigo: codigo });
    if (error) throw new Error(error.message);
    return data;
  },
};
