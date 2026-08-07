import type { Database } from "./database.types";
import type {
  ChatMessage,
  Commitment,
  EventProposal,
  Profile,
  Rating,
} from "../../domain/entities/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PublicProfileRow = Database["public"]["Tables"]["public_profiles"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type CommitmentRow = Database["public"]["Tables"]["commitments"]["Row"];
type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];
type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

export const toProfile = (row: ProfileRow | PublicProfileRow): Profile => ({
  id: row.id,
  nome: row.nome,
  fotoUrl: row.foto_url,
  // `public_profiles` não tem data_nascimento — undefined vira "" aqui
  // porque esta função só deve ser chamada para o PRÓPRIO perfil
  // quando a idade importa; em qualquer outro contexto, use os campos
  // públicos diretamente (nunca confie neste valor vindo da view).
  dataNascimento: "data_nascimento" in row ? row.data_nascimento : "",
  genero: row.genero,
  localizacaoBase: row.localizacao_base,
  categoriasInteresse: row.categorias_interesse,
  scoreConfiabilidade: row.score_confiabilidade,
  selo: row.selo,
  criadoEm: row.criado_em,
});

export const toEventProposal = (row: EventRow): EventProposal => ({
  id: row.id,
  criadorId: row.criador_id,
  categoria: row.categoria,
  titulo: row.titulo,
  descricao: row.descricao,
  dataHora: row.data_hora,
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
});

export const toCommitment = (row: CommitmentRow): Commitment => ({
  id: row.id,
  eventId: row.event_id,
  userId: row.user_id,
  status: row.status,
  confirmadoEm: row.confirmado_em,
  checkinEm: row.checkin_em,
});

export const toChatMessage = (row: ChatMessageRow): ChatMessage => ({
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
