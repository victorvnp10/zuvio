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
  /** Nunca exibida publicamente — só para verificação de idade mínima e segmentação. */
  dataNascimento: string;
  /** Campo opcional — nunca usado para restringir acesso, só segmentação. */
  genero: string | null;
  localizacaoBase: string;
  categoriasInteresse: EventCategory[];
  scoreConfiabilidade: number;
  selo: TrustBadge;
  criadoEm: string;
}

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
}

export interface Commitment {
  id: string;
  eventId: string;
  userId: string;
  status: CommitmentStatus;
  confirmadoEm: string;
  checkinEm: string | null;
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
