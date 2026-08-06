import type { Database } from "./database.types";
import type {
  ActivityCheckin,
  ActivityRating,
  Category,
  ChatMessage,
  CollaborativeItem,
  Commitment,
  ConferenceActivity,
  EarnedTrophy,
  EventAnnouncement,
  EventPhoto,
  EventProposal,
  Friendship,
  FriendGroup,
  Profile,
  Rating,
  SharedGroup,
  GroupMember,
  GroupInvite,
  Trophy,
} from "../../domain/entities/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PublicProfileRow = Database["public"]["Tables"]["public_profiles"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type CommitmentRow = Database["public"]["Tables"]["commitments"]["Row"];
type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];
type EventAnnouncementRow = Database["public"]["Tables"]["event_announcements"]["Row"];
type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];
type FriendshipRow = Database["public"]["Tables"]["friendships"]["Row"];
type FriendGroupRow = Database["public"]["Tables"]["friend_groups"]["Row"];
type CollaborativeItemRow = Database["public"]["Tables"]["collaborative_items"]["Row"];
type EventPhotoRow = Database["public"]["Tables"]["event_photos"]["Row"];
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"];
type GroupInviteRow = Database["public"]["Tables"]["group_invites"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type TrophyRow = Database["public"]["Tables"]["trophies"]["Row"];
type ConferenceActivityRow = Database["public"]["Tables"]["conference_activities"]["Row"];
type ActivityCheckinRow = Database["public"]["Tables"]["activity_checkins"]["Row"];
type ActivityRatingRow = Database["public"]["Tables"]["activity_ratings"]["Row"];

export const toProfile = (row: ProfileRow | PublicProfileRow): Profile => ({
  id: row.id,
  nome: row.nome,
  fotoUrl: row.foto_url,
  // `public_profiles` não tem data_nascimento — undefined vira null
  // aqui porque esta função só deve ser chamada com o valor real
  // quando é o PRÓPRIO perfil da pessoa; em qualquer outro contexto,
  // use os campos públicos diretamente (nunca confie neste valor vindo
  // da view pública).
  dataNascimento: "data_nascimento" in row ? row.data_nascimento : null,
  genero: row.genero,
  localizacaoBase: row.localizacao_base,
  categoriasInteresse: row.categorias_interesse,
  scoreConfiabilidade: row.score_confiabilidade,
  selo: row.selo,
  isAdmin: "is_admin" in row ? row.is_admin : false,
  pontosReputacao: row.pontos_reputacao,
  criadoEm: row.criado_em,
});

export const toTrophy = (row: TrophyRow): Trophy => ({
  id: row.id,
  nome: row.nome,
  descricao: row.descricao,
  emoji: row.emoji,
  criterioTipo: row.criterio_tipo,
  criterioValor: row.criterio_valor,
  ordem: row.ordem,
});

export const toEarnedTrophy = (trophyRow: TrophyRow, conquistadoEm: string): EarnedTrophy => ({
  ...toTrophy(trophyRow),
  conquistadoEm,
});

export const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  nome: row.nome,
  emoji: row.emoji,
  cor: row.cor,
  ordem: row.ordem,
  ativo: row.ativo,
  criadoEm: row.criado_em,
});

export const toEventProposal = (row: EventRow): EventProposal => ({
  id: row.id,
  criadorId: row.criador_id,
  categoria: row.categoria,
  titulo: row.titulo,
  descricao: row.descricao,
  dataHora: row.data_hora,
  dataHoraFim: row.data_hora_fim,
  local: {
    endereco: row.endereco,
    geo: row.geo_lat != null && row.geo_lng != null ? { lat: row.geo_lat, lng: row.geo_lng } : null,
  },
  modalidade: row.modalidade,
  vagasTotal: row.vagas_total,
  vagasConfirmadas: row.vagas_confirmadas,
  quorumMinimo: row.quorum_minimo,
  status: row.status,
  criadoEm: row.criado_em,
  tipoEvento: row.tipo_evento,
  capaUrl: row.capa_url,
  fotosPublicas: row.fotos_publicas,
  valorEntrada: row.valor_entrada,
  linkPagamento: row.link_pagamento,
  modoListaColaborativa: row.modo_lista_colaborativa,
  modoCustoColaborativo: row.modo_custo_colaborativo,
  valorPorPessoa: row.valor_por_pessoa,
  valorTotalRateio: row.valor_total_rateio,
});

export const toConferenceActivity = (row: ConferenceActivityRow): ConferenceActivity => ({
  id: row.id,
  eventId: row.event_id,
  titulo: row.titulo,
  descricao: row.descricao,
  local: row.local,
  geo: row.geo_lat != null && row.geo_lng != null ? { lat: row.geo_lat, lng: row.geo_lng } : null,
  capaUrl: row.capa_url,
  dataHoraInicio: row.data_hora_inicio,
  dataHoraFim: row.data_hora_fim,
  ordem: row.ordem,
  criadoEm: row.criado_em,
});

export const toActivityCheckin = (row: ActivityCheckinRow): ActivityCheckin => ({
  id: row.id,
  activityId: row.activity_id,
  userId: row.user_id,
  checkinEm: row.checkin_em,
});

export const toActivityRating = (row: ActivityRatingRow): ActivityRating => ({
  id: row.id,
  activityId: row.activity_id,
  userId: row.user_id,
  nota: row.nota,
  comentario: row.comentario,
  criadoEm: row.criado_em,
});

export const toCommitment = (row: CommitmentRow): Commitment => ({
  id: row.id,
  eventId: row.event_id,
  userId: row.user_id,
  status: row.status,
  confirmadoEm: row.confirmado_em,
  checkinEm: row.checkin_em,
  pagamentoConfirmado: row.pagamento_confirmado,
  googleCalendarEventId: row.google_calendar_event_id,
});

export const toChatMessage = (row: ChatMessageRow): ChatMessage => ({
  id: row.id,
  eventId: row.event_id,
  autorId: row.autor_id,
  texto: row.texto,
  criadoEm: row.criado_em,
});

export const toEventAnnouncement = (row: EventAnnouncementRow): EventAnnouncement => ({
  id: row.id,
  eventId: row.event_id,
  autorId: row.autor_id,
  texto: row.texto,
  criadoEm: row.criado_em,
});

export const toRating = (row: RatingRow): Rating => ({
  id: row.id,
  eventId: row.event_id,
  avaliadorId: row.avaliador_id,
  avaliadoId: row.avaliado_id,
  nota: row.nota,
  comentario: row.comentario,
  criadoEm: row.criado_em,
});

export const toFriendship = (row: FriendshipRow): Friendship => ({
  id: row.id,
  requesterId: row.requester_id,
  addresseeId: row.addressee_id,
  status: row.status,
  criadoEm: row.criado_em,
});

export const toFriendGroup = (row: FriendGroupRow): FriendGroup => ({
  id: row.id,
  ownerId: row.owner_id,
  nome: row.nome,
  isSystem: row.is_system,
  criadoEm: row.criado_em,
});

export const toCollaborativeItem = (row: CollaborativeItemRow): CollaborativeItem => ({
  id: row.id,
  eventId: row.event_id,
  nome: row.nome,
  criadoPor: row.criado_por,
  reservadoPor: row.reservado_por,
  criadoEm: row.criado_em,
});

export const toEventPhoto = (row: EventPhotoRow): EventPhoto => ({
  id: row.id,
  eventId: row.event_id,
  autorId: row.autor_id,
  fotoUrl: row.foto_url,
  visibilidade: row.visibilidade,
  criadoEm: row.criado_em,
});

export const toSharedGroup = (row: GroupRow): SharedGroup => ({
  id: row.id,
  criadorId: row.criador_id,
  nome: row.nome,
  descricao: row.descricao,
  fotoUrl: row.foto_url,
  criadoEm: row.criado_em,
});

export const toGroupMember = (row: GroupMemberRow): GroupMember => ({
  groupId: row.group_id,
  userId: row.user_id,
  papel: row.papel,
  entrouEm: row.entrou_em,
});

export const toGroupInvite = (row: GroupInviteRow): GroupInvite => ({
  id: row.id,
  groupId: row.group_id,
  criadoPor: row.criado_por,
  codigo: row.codigo,
  ativo: row.ativo,
  criadoEm: row.criado_em,
});
