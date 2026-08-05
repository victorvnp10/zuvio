/**
 * Tipos de domínio do Zuvio.
 *
 * Estes tipos representam os conceitos de negócio (ver seção 10 da
 * especificação) — não são tipos de linha de banco de dados. A camada
 * de infraestrutura (`infrastructure/supabase/`) é responsável por
 * converter entre o formato bruto do Postgres e estes tipos.
 */

export type EventCategory =
  | "esporte"
  | "viagem"
  | "hobby"
  | "encontro"
  | "estudo"
  | "outro";

export type EventModality = "estranhos" | "amigos" | "hibrida" | "restrita";

/**
 * Estados do ciclo de vida de uma proposta de evento.
 *
 * aberto            → aceitando novas confirmações, quórum ainda não atingido
 * quorum_atingido   → quórum mínimo alcançado; chat já liberado; ainda aceita
 *                      confirmações até completar as vagas
 * fechado           → vagas completas, não aceita mais confirmações
 * concluido         → data do evento já passou
 * cancelado         → cancelado pelo criador ou pela moderação
 */
export type EventStatus =
  | "aberto"
  | "quorum_atingido"
  | "fechado"
  | "concluido"
  | "cancelado";

export type CommitmentStatus =
  | "confirmado"
  | "check-in"
  | "no-show"
  | "cancelado";

export type TrustBadge = "nenhum" | "bronze" | "prata" | "ouro";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Profile {
  id: string;
  nome: string;
  fotoUrl: string | null;
  /** Nunca exibida publicamente — só para verificação de idade mínima e segmentação.
   * `null` = perfil incompleto (comum logo após login com Google) — a
   * aplicação deve levar a pessoa para completar antes de liberar o
   * resto do app. */
  dataNascimento: string | null;
  /** Campo opcional — nunca usado para restringir acesso, só segmentação. */
  genero: string | null;
  localizacaoBase: string | null;
  categoriasInteresse: EventCategory[];
  scoreConfiabilidade: number;
  selo: TrustBadge;
  criadoEm: string;
}

export type TipoEvento = "livre" | "pago" | "colaborativo";
export type ModoListaColaborativa = "predefinida" | "livre" | "mista";
export type ModoCustoColaborativo = "nenhum" | "valor_fixo_por_pessoa" | "rateio_entre_presentes";

export interface EventProposal {
  id: string;
  criadorId: string;
  categoria: EventCategory;
  titulo: string;
  descricao: string;
  dataHora: string;
  local: {
    endereco: string;
    geo: GeoPoint | null;
  };
  modalidade: EventModality;
  vagasTotal: number;
  vagasConfirmadas: number;
  /** Nº de confirmações necessárias para liberar o chat — sempre ≤ vagasTotal. */
  quorumMinimo: number;
  status: EventStatus;
  criadoEm: string;

  tipoEvento: TipoEvento;

  /** null = usa o gradiente por categoria como capa (ver CATEGORY_COVER). */
  capaUrl: string | null;

  // tipoEvento === "pago"
  valorEntrada: number | null;
  linkPagamento: string | null;

  // tipoEvento === "colaborativo"
  modoListaColaborativa: ModoListaColaborativa | null;
  modoCustoColaborativo: ModoCustoColaborativo | null;
  valorPorPessoa: number | null;
  valorTotalRateio: number | null;
}

/** Item da lista colaborativa ("o que levar"). */
export interface CollaborativeItem {
  id: string;
  eventId: string;
  nome: string;
  criadoPor: string;
  /** null = ninguém marcou ainda que vai levar este item. */
  reservadoPor: string | null;
  criadoEm: string;
}

export type FotoVisibilidade = "evento" | "publica";

/** Foto postada por um participante (ou organizador) de um evento. */
export interface EventPhoto {
  id: string;
  eventId: string;
  autorId: string;
  fotoUrl: string;
  visibilidade: FotoVisibilidade;
  criadoEm: string;
}

export interface PhotoComment {
  id: string;
  photoId: string;
  autorId: string;
  texto: string;
  criadoEm: string;
}

export interface Commitment {
  id: string;
  eventId: string;
  userId: string;
  status: CommitmentStatus;
  confirmadoEm: string;
  checkinEm: string | null;
  pagamentoConfirmado: boolean;
  googleCalendarEventId: string | null;
}

export interface ChatMessage {
  id: string;
  eventId: string;
  autorId: string;
  texto: string;
  criadoEm: string;
}

export interface Rating {
  id: string;
  eventId: string;
  avaliadorId: string;
  avaliadoId: string;
  nota: number; // 1-5
  comentario: string | null;
  criadoEm: string;
}

export interface Invite {
  id: string;
  eventId: string;
  criadoPor: string;
  codigo: string;
  uso: "unico" | "multiplo";
  expiraEm: string | null;
  usadoPor: string[];
}

export type FriendshipStatus = "pendente" | "aceito";

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  criadoEm: string;
}

/** Um agrupamento nomeado dentro dos amigos de alguém — "Melhores
 * Amigos" é criado automaticamente (isSystem) para todo usuário;
 * "Amigos da escola", "Amigos do trabalho" etc. são criados livremente. */
export interface FriendGroup {
  id: string;
  ownerId: string;
  nome: string;
  isSystem: boolean;
  criadoEm: string;
}
