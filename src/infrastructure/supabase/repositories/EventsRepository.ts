import { supabase } from "../client";
import { toEventProposal } from "../mappers";
import type {
  EventCategory,
  EventProposal,
  ModoCustoColaborativo,
  ModoListaColaborativa,
  TipoEvento,
} from "../../../domain/entities/types";

export interface CreateEventInput {
  criadorId: string;
  categoria: EventCategory;
  titulo: string;
  descricao: string;
  dataHoraISO: string;
  /** Obrigatória quando `tipoEvento === "conferencia"` — o banco rejeita
   * a criação sem ela (constraint `conferencia_tem_data_fim`). */
  dataHoraFimISO?: string | null;
  endereco: string;
  geo: { lat: number; lng: number } | null;
  modalidade: EventProposal["modalidade"];
  vagasTotal: number;
  quorumMinimo: number;
  tipoEvento: TipoEvento;
  valorEntrada?: number | null;
  linkPagamento?: string | null;
  modoListaColaborativa?: ModoListaColaborativa | null;
  modoCustoColaborativo?: ModoCustoColaborativo | null;
  valorPorPessoa?: number | null;
  valorTotalRateio?: number | null;
  /** Decisão do organizador — default false (só participantes veem). */
  fotosPublicas?: boolean;
  /** Default false — quando true, confirmar presença entra como
   * "pendente" até o organizador aprovar (ver migração 0038). */
  exigeAprovacao?: boolean;
}

export interface UpdateEventInput {
  titulo?: string;
  descricao?: string;
  endereco?: string;
  geo?: { lat: number; lng: number } | null;
  dataHoraISO?: string;
  dataHoraFimISO?: string | null;
  categoria?: EventCategory;
  modalidade?: EventProposal["modalidade"];
  vagasTotal?: number;
  quorumMinimo?: number;
  tipoEvento?: TipoEvento;
  capaUrl?: string | null;
  valorEntrada?: number | null;
  linkPagamento?: string | null;
  modoListaColaborativa?: ModoListaColaborativa | null;
  modoCustoColaborativo?: ModoCustoColaborativo | null;
  valorPorPessoa?: number | null;
  valorTotalRateio?: number | null;
  fotosPublicas?: boolean;
  exigeAprovacao?: boolean;
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
        data_hora_fim: input.dataHoraFimISO ?? null,
        endereco: input.endereco,
        geo_lat: input.geo?.lat ?? null,
        geo_lng: input.geo?.lng ?? null,
        modalidade: input.modalidade,
        vagas_total: input.vagasTotal,
        quorum_minimo: input.quorumMinimo,
        tipo_evento: input.tipoEvento,
        valor_entrada: input.valorEntrada ?? null,
        link_pagamento: input.linkPagamento ?? null,
        modo_lista_colaborativa: input.modoListaColaborativa ?? null,
        modo_custo_colaborativo: input.modoCustoColaborativo ?? null,
        valor_por_pessoa: input.valorPorPessoa ?? null,
        valor_total_rateio: input.valorTotalRateio ?? null,
        fotos_publicas: input.fotosPublicas ?? false,
        exige_aprovacao: input.exigeAprovacao ?? false,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return toEventProposal(data);
  },

  /**
   * Todo campo de conteúdo E de regra do evento pode ser editado depois
   * de criado — inclusive vagas e quórum. As constraints do banco
   * (`quorum_within_vagas`, `vagas_within_total`) impedem estados
   * inválidos (reduzir vagas abaixo do que já foi confirmado, ou
   * quórum maior que o total), e um trigger recalcula `status`
   * automaticamente depois da mudança (ver migração 0004).
   */
  async update(eventId: string, changes: UpdateEventInput): Promise<EventProposal> {
    const patch: Record<string, unknown> = {};
    if (changes.titulo !== undefined) patch.titulo = changes.titulo;
    if (changes.descricao !== undefined) patch.descricao = changes.descricao;
    if (changes.endereco !== undefined) patch.endereco = changes.endereco;
    if (changes.dataHoraISO !== undefined) patch.data_hora = changes.dataHoraISO;
    if (changes.dataHoraFimISO !== undefined) patch.data_hora_fim = changes.dataHoraFimISO;
    if (changes.categoria !== undefined) patch.categoria = changes.categoria;
    if (changes.modalidade !== undefined) patch.modalidade = changes.modalidade;
    if (changes.vagasTotal !== undefined) patch.vagas_total = changes.vagasTotal;
    if (changes.quorumMinimo !== undefined) patch.quorum_minimo = changes.quorumMinimo;
    if (changes.tipoEvento !== undefined) patch.tipo_evento = changes.tipoEvento;
    if (changes.capaUrl !== undefined) patch.capa_url = changes.capaUrl;
    if (changes.valorEntrada !== undefined) patch.valor_entrada = changes.valorEntrada;
    if (changes.linkPagamento !== undefined) patch.link_pagamento = changes.linkPagamento;
    if (changes.modoListaColaborativa !== undefined)
      patch.modo_lista_colaborativa = changes.modoListaColaborativa;
    if (changes.modoCustoColaborativo !== undefined)
      patch.modo_custo_colaborativo = changes.modoCustoColaborativo;
    if (changes.valorPorPessoa !== undefined) patch.valor_por_pessoa = changes.valorPorPessoa;
    if (changes.valorTotalRateio !== undefined) patch.valor_total_rateio = changes.valorTotalRateio;
    if (changes.fotosPublicas !== undefined) patch.fotos_publicas = changes.fotosPublicas;
    if (changes.exigeAprovacao !== undefined) patch.exige_aprovacao = changes.exigeAprovacao;
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

  /**
   * Exclusão de verdade (apaga a linha, cascade em commitments/chat/
   * etc.) — só permitido pela RLS enquanto o evento ainda não atingiu
   * o quórum (`status = 'aberto'`). Depois disso, use `cancel()`.
   */
  async remove(eventId: string): Promise<void> {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
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

  /** Varredura best-effort de eventos vencidos (marca 'concluido' e
   * vira 'no-show' quem confirmou e nunca fez check-in) — chamada uma
   * vez por sessão pelo `AnalyticsTracker`, sem bloquear nada se falhar. */
  async concludePastEvents(): Promise<void> {
    const { error } = await supabase.rpc("conclude_past_events");
    if (error) throw new Error(error.message);
  },
};
