/**
 * Tipos de domínio do Zuvio.
 *
 * Estes tipos representam os conceitos de negócio (ver seção 10 da
 * especificação) — não são tipos de linha de banco de dados. A camada
 * de infraestrutura (`infrastructure/supabase/`) é responsável por
 * converter entre o formato bruto do Postgres e estes tipos.
 */

/** Id (slug) de uma categoria — deixou de ser um conjunto fixo desde
 * que o painel admin passou a gerenciar categorias (ver `Category`). */
export type EventCategory = string;

/** Categoria de evento, administrável pelo gestor da plataforma. */
export interface Category {
  id: string;
  nome: string;
  emoji: string;
  /** Hex — usado tanto no pontinho quanto no gradiente da capa. */
  cor: string;
  ordem: number;
  ativo: boolean;
  criadoEm: string;
}

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
  /** Só vem preenchido de verdade a partir de `getOwn()` (o próprio
   * usuário) — `public_profiles` não expõe esse campo. */
  isAdmin: boolean;
  /** Pontos de reputação (gamificação): +10 por check-in, -15 por
   * no-show, -5 por cancelamento, piso em zero. Complementa
   * `scoreConfiabilidade`/`selo` com um número que sobe e desce de
   * forma visível a cada compromisso resolvido. */
  pontosReputacao: number;
  criadoEm: string;
}

/** Troféu do catálogo — o mesmo pra todo mundo, conquistado ou não. */
export interface Trophy {
  id: string;
  nome: string;
  descricao: string;
  emoji: string;
  criterioTipo: "checkins" | "pontos" | "selo_ouro";
  criterioValor: number | null;
  ordem: number;
}

/** Um troféu já conquistado por um perfil específico. */
export interface EarnedTrophy extends Trophy {
  conquistadoEm: string;
}

export type TipoEvento = "livre" | "pago" | "colaborativo" | "conferencia";
export type ModoListaColaborativa = "predefinida" | "livre" | "mista";
export type ModoCustoColaborativo = "nenhum" | "valor_fixo_por_pessoa" | "rateio_entre_presentes";

export interface EventProposal {
  id: string;
  criadorId: string;
  categoria: EventCategory;
  titulo: string;
  descricao: string;
  dataHora: string;
  /** Só preenchida quando `tipoEvento === "conferencia"` — a data/hora
   * de início de um evento comum já é suficiente pra durar um dia só. */
  dataHoraFim: string | null;
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

  /** null = usa o gradiente da categoria como capa (ver `categoryGradientStyle`). */
  capaUrl: string | null;

  /** Decisão do ORGANIZADOR (não de quem posta) — vale pra todas as
   * fotos do evento de uma vez: false = só quem participa (ou o
   * organizador) vê; true = qualquer um vê, inclusive no carrossel
   * "reels" da capa no feed principal. */
  fotosPublicas: boolean;

  // tipoEvento === "pago"
  valorEntrada: number | null;
  linkPagamento: string | null;

  // tipoEvento === "colaborativo"
  modoListaColaborativa: ModoListaColaborativa | null;
  modoCustoColaborativo: ModoCustoColaborativo | null;
  valorPorPessoa: number | null;
  valorTotalRateio: number | null;
}

/** Uma atividade da programação de uma conferência (tipoEvento ===
 * "conferencia") — título, descrição, local e capa próprios, como se
 * fosse um evento isolado dentro do evento maior. */
export interface ConferenceActivity {
  id: string;
  eventId: string;
  titulo: string;
  descricao: string;
  local: string;
  geo: GeoPoint | null;
  capaUrl: string | null;
  dataHoraInicio: string;
  dataHoraFim: string;
  ordem: number;
  criadoEm: string;
}

/** Check-in de um participante numa atividade específica de uma
 * conferência — independente do commitment do evento como um todo. */
export interface ActivityCheckin {
  id: string;
  activityId: string;
  userId: string;
  checkinEm: string;
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

/** Aviso do organizador — diferente do chat: não depende do quórum,
 * só quem organiza pode postar, lido por quem participa (ou pelo
 * próprio organizador). */
export interface EventAnnouncement {
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

export type GroupMemberRole = "admin" | "membro";

/** Grupo compartilhado estilo WhatsApp: várias pessoas pertencem ao
 * mesmo grupo (diferente de FriendGroup, que é um marcador pessoal na
 * lista de amigos de um único usuário). Quem cria vira admin; admin
 * adiciona/remove membros diretamente ou via link de convite. */
export interface SharedGroup {
  id: string;
  criadorId: string;
  nome: string;
  descricao: string | null;
  fotoUrl: string | null;
  criadoEm: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  papel: GroupMemberRole;
  entrouEm: string;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  criadoPor: string;
  codigo: string;
  ativo: boolean;
  criadoEm: string;
}
