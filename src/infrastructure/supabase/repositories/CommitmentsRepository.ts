import { supabase } from "../client";
import { toCommitment, toPendingRegistration } from "../mappers";
import type { Commitment, PendingRegistration } from "../../../domain/entities/types";

export interface CheckinResult {
  commitment: Commitment;
  pontosGanhos: number;
  pontosTotais: number;
  trofeusNovos: { id: string; nome: string; emoji: string; descricao: string }[];
}

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

  /** Inclui 'pendente' (quem ainda não foi aprovado) — quem consome
   * esta lista filtra pelo status específico que importa em cada
   * contexto (ver `TicketHeroAttendance`/`ParticipantsModal`). */
  async listForEvent(eventId: string): Promise<Commitment[]> {
    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .eq("event_id", eventId)
      .neq("status", "cancelado")
      .neq("status", "rejeitado");
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCommitment);
  },

  /** Todos os compromissos confirmados de um conjunto de eventos, sem filtro de usuário — usado para a pilha de avatares no feed. */
  async listForEvents(eventIds: string[]): Promise<Commitment[]> {
    if (eventIds.length === 0) return [];
    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .in("event_id", eventIds)
      .in("status", ["confirmado", "check-in"]);
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
      .neq("status", "cancelado")
      .neq("status", "rejeitado");
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

  /** `lat`/`lng` ficam de fora quando o evento não tem geolocalização
   * salva — nesse caso o check-in só valida a janela de horário (ver
   * migração 0030). */
  async checkin(eventId: string, lat: number | null, lng: number | null): Promise<CheckinResult> {
    const { data, error } = await supabase.rpc("checkin_event", {
      p_event_id: eventId,
      p_lat: lat,
      p_lng: lng,
    });
    if (error) throw new Error(error.message);
    return {
      commitment: toCommitment(data.commitment),
      pontosGanhos: data.pontos_ganhos,
      pontosTotais: data.pontos_totais,
      trofeusNovos: data.trofeus_novos ?? [],
    };
  },

  /** Compromissos já resolvidos (check-in, no-show ou cancelado) —
   * histórico de comparecimento, mais recente primeiro. */
  async listMineResolved(userId: string): Promise<Commitment[]> {
    const { data, error } = await supabase
      .from("commitments")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["check-in", "no-show", "cancelado"])
      .order("confirmado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCommitment);
  },

  /** Autoconfirmação (evento tipo "pago") de que a pessoa já usou o link de pagamento. */
  async confirmPayment(eventId: string): Promise<void> {
    const { error } = await supabase.rpc("confirm_payment", { p_event_id: eventId });
    if (error) throw new Error(error.message);
  },

  /** Inscrições pendentes de um evento, com nome + e-mail — só o
   * organizador do evento consegue chamar (ver migração 0038). */
  async listPending(eventId: string): Promise<PendingRegistration[]> {
    const { data, error } = await supabase.rpc("list_pending_registrations", {
      p_event_id: eventId,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toPendingRegistration);
  },

  async approve(commitmentId: string): Promise<Commitment> {
    const { data, error } = await supabase.rpc("approve_commitment", {
      p_commitment_id: commitmentId,
    });
    if (error) throw new Error(error.message);
    return toCommitment(data);
  },

  async reject(commitmentId: string): Promise<void> {
    const { error } = await supabase.rpc("reject_commitment", { p_commitment_id: commitmentId });
    if (error) throw new Error(error.message);
  },

  /** Check-in feito pelo ORGANIZADOR em nome de quem esqueceu de fazer
   * o próprio — sem geofence/janela de horário (ver migração 0040). */
  async adminCheckin(eventId: string, userId: string): Promise<CheckinResult> {
    const { data, error } = await supabase.rpc("admin_checkin", {
      p_event_id: eventId,
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
    return {
      commitment: toCommitment(data.commitment),
      pontosGanhos: data.pontos_ganhos,
      pontosTotais: data.pontos_totais,
      trofeusNovos: data.trofeus_novos ?? [],
    };
  },
};
