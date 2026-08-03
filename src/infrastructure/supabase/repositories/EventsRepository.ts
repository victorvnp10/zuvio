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

export interface UpdateEventInput {
  titulo?: string;
  descricao?: string;
  endereco?: string;
  geo?: { lat: number; lng: number } | null;
  dataHoraISO?: string;
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

  /**
   * Só os campos de conteúdo podem mudar depois de criado (título,
   * descrição, local, data) — vagas/quórum/modalidade/categoria ficam
   * travados após a criação de propósito: mudar `vagas_total` ou
   * `quorum_minimo` depois que já existem confirmações quebraria a
   * invariante do quórum; mudar `modalidade` poderia burlar a regra de
   * que eventos Restritos nunca aparecem no feed público.
   */
  async update(eventId: string, changes: UpdateEventInput): Promise<EventProposal> {
    const patch: Record<string, unknown> = {};
    if (changes.titulo !== undefined) patch.titulo = changes.titulo;
    if (changes.descricao !== undefined) patch.descricao = changes.descricao;
    if (changes.endereco !== undefined) patch.endereco = changes.endereco;
    if (changes.dataHoraISO !== undefined) patch.data_hora = changes.dataHoraISO;
    if (changes.geo !== undefined) {
      patch.geo_lat = changes.geo?.lat ?? null;
      patch.geo_lng = changes.geo?.lng ?? null;
    }

    const { data, error } = await supabase
      .from("events")
      .update(patch)
      .eq("id", eventId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toEventProposal(data);
  },

  /**
   * "Excluir" um evento, na prática, marca `status = 'cancelado'` em
   * vez de apagar a linha — quem já confirmou presença continua vendo
   * que o evento existiu e foi cancelado, em vez de ele simplesmente
   * desaparecer sem explicação. Some do feed público (a query de
   * descoberta só busca `aberto`/`quorum_atingido`).
   */
  async cancel(eventId: string): Promise<void> {
    const { error } = await supabase
      .from("events")
      .update({ status: "cancelado" })
      .eq("id", eventId);
    if (error) throw new Error(error.message);
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
