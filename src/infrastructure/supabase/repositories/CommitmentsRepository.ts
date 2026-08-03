import { supabase } from "../client";
import { toCommitment } from "../mappers";
import type { Commitment } from "../../../domain/entities/types";

/**
 * Todas as escritas passam pelas funções RPC do banco (ver
 * `supabase/migrations/0001_initial_schema.sql`) — nunca por
 * insert/update direto na tabela `commitments`. É lá que vive a
 * validação atômica de quórum/vagas (com lock de linha), então este
 * repositório só expõe as chamadas, sem duplicar regra nenhuma aqui.
 */
export const CommitmentsRepository = {
  async listMine(userId: string): Promise<Commitment[]> {
    const { data, error } = await supabase.from("commitments").select("*").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCommitment);
  },

  async listForEvent(eventId: string): Promise<Commitment[]> {
    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .eq("event_id", eventId)
      .neq("status", "cancelado");
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCommitment);
  },

  /** Usado para descobrir quais amigos já confirmaram presença num conjunto de eventos (ranking do feed). */
  async listForEventsAndUsers(eventIds: string[], userIds: string[]): Promise<Commitment[]> {
    if (eventIds.length === 0 || userIds.length === 0) return [];
    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .in("event_id", eventIds)
      .in("user_id", userIds)
      .neq("status", "cancelado");
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCommitment);
  },

  async commit(eventId: string): Promise<Commitment> {
    const { data, error } = await supabase.rpc("commit_to_event", { p_event_id: eventId });
    if (error) throw new Error(error.message);
    return toCommitment(data);
  },

  async cancel(eventId: string): Promise<void> {
    const { error } = await supabase.rpc("cancel_commitment", { p_event_id: eventId });
    if (error) throw new Error(error.message);
  },

  async checkin(eventId: string, lat: number, lng: number): Promise<Commitment> {
    const { data, error } = await supabase.rpc("checkin_event", {
      p_event_id: eventId,
      p_lat: lat,
      p_lng: lng,
    });
    if (error) throw new Error(error.message);
    return toCommitment(data);
  },

  /** Autoconfirmação (evento tipo "pago") de que a pessoa já usou o link de pagamento. */
  async confirmPayment(eventId: string): Promise<void> {
    const { error } = await supabase.rpc("confirm_payment", { p_event_id: eventId });
    if (error) throw new Error(error.message);
  },
};
