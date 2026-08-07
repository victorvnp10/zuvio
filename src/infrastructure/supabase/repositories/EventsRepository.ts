import { supabase } from "../client";
import { toEventProposal } from "../mappers";
import type { EventCategory, EventProposal } from "../../../domain/entities/types";

export interface CreateEventInput {
  criadorId: string;
  categoria: EventCategory;
  titulo: string;
  descricao: string;
  dataHoraISO: string;
  endereco: string;
  geo: { lat: number; lng: number } | null;
  modalidade: EventProposal["modalidade"];
  vagasTotal: number;
  quorumMinimo: number;
}

export const EventsRepository = {
  async listDiscoveryFeed(params: { categoria?: EventCategory; limit?: number } = {}) {
    let query = supabase
      .from("events")
      .select("*")
      .in("status", ["aberto", "quorum_atingido"])
      .order("data_hora", { ascending: true })
      .limit(params.limit ?? 30);

    if (params.categoria) {
      query = query.eq("categoria", params.categoria);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toEventProposal);
  },

  async getById(eventId: string): Promise<EventProposal | null> {
    const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw new Error(error.message);
    }
    return toEventProposal(data);
  },

  async listMine(userId: string): Promise<EventProposal[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("criador_id", userId)
      .order("data_hora", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toEventProposal);
  },

  async create(input: CreateEventInput): Promise<EventProposal> {
    const { data, error } = await supabase
      .from("events")
      .insert({
        criador_id: input.criadorId,
        categoria: input.categoria,
        titulo: input.titulo,
        descricao: input.descricao,
        data_hora: input.dataHoraISO,
        endereco: input.endereco,
        geo_lat: input.geo?.lat ?? null,
        geo_lng: input.geo?.lng ?? null,
        modalidade: input.modalidade,
        vagas_total: input.vagasTotal,
        quorum_minimo: input.quorumMinimo,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return toEventProposal(data);
  },

  /** Assina mudanças em tempo real num evento específico (placar de vagas/status). */
  subscribeToEvent(eventId: string, onChange: (event: EventProposal) => void) {
    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${eventId}` },
        (payload) => onChange(toEventProposal(payload.new as never))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
