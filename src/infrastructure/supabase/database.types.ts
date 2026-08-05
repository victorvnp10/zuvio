/**
 * Tipos gerados manualmente a partir de `supabase/migrations/0001_initial_schema.sql`.
 *
 * Quando o projeto Supabase estiver criado, o ideal é substituir este
 * arquivo pelo gerado automaticamente:
 *   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/infrastructure/supabase/database.types.ts
 * Mantido manual por enquanto para o projeto compilar sem depender de
 * um projeto Supabase já provisionado.
 */

export type EventModalityRow = "estranhos" | "amigos" | "hibrida" | "restrita";
export type EventStatusRow =
  | "aberto"
  | "quorum_atingido"
  | "fechado"
  | "concluido"
  | "cancelado";
export type CommitmentStatusRow = "confirmado" | "check-in" | "no-show" | "cancelado";
export type TrustBadgeRow = "nenhum" | "bronze" | "prata" | "ouro";

/** Formato retornado por `admin_get_dashboard_stats()` (ver migração 0028). */
export interface AdminDashboardStats {
  usuariosTotais: number;
  novosUsuarios7d: number;
  usuariosAtivos24h: number;
  usuariosAtivos7d: number;
  usuariosAtivos30d: number;
  sessoes30d: number;
  tempoMedioSessaoMin: number;
  taxaSessaoUnicoEvento30d: number;
  eventosPropostasTotal: number;
  eventosPropostas7d: number;
  compromissosConfirmadosTotal: number;
  checkinsTotal: number;
  taxaCheckin: number;
  mensagensChatTotal: number;
  fotosPostadasTotal: number;
  pageViewsPorDia: { dia: string; contagem: number }[];
  topPaginas7d: { path: string; contagem: number }[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          foto_url: string | null;
          data_nascimento: string | null;
          genero: string | null;
          localizacao_base: string | null;
          categorias_interesse: string[];
          score_confiabilidade: number;
          selo: TrustBadgeRow;
          is_admin: boolean;
          criado_em: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      public_profiles: {
        Row: Omit<
          Database["public"]["Tables"]["profiles"]["Row"],
          "data_nascimento" | "is_admin"
        >;
      };
      events: {
        Row: {
          id: string;
          criador_id: string;
          categoria: string;
          titulo: string;
          descricao: string;
          data_hora: string;
          endereco: string;
          geo_lat: number | null;
          geo_lng: number | null;
          modalidade: EventModalityRow;
          vagas_total: number;
          vagas_confirmadas: number;
          quorum_minimo: number;
          status: EventStatusRow;
          criado_em: string;
          tipo_evento: "livre" | "pago" | "colaborativo";
          valor_entrada: number | null;
          link_pagamento: string | null;
          modo_lista_colaborativa: "predefinida" | "livre" | "mista" | null;
          modo_custo_colaborativo: "nenhum" | "valor_fixo_por_pessoa" | "rateio_entre_presentes" | null;
          valor_por_pessoa: number | null;
          valor_total_rateio: number | null;
          capa_url: string | null;
          fotos_publicas: boolean;
        };
        Insert: Omit<
          Database["public"]["Tables"]["events"]["Row"],
          "id" | "vagas_confirmadas" | "status" | "criado_em"
        >;
        Update: Partial<
          Omit<Database["public"]["Tables"]["events"]["Row"], "id" | "criado_em" | "criador_id">
        >;
      };
      commitments: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: CommitmentStatusRow;
          confirmado_em: string;
          checkin_em: string | null;
          pagamento_confirmado: boolean;
          google_calendar_event_id: string | null;
        };
      };
      collaborative_items: {
        Row: {
          id: string;
          event_id: string;
          nome: string;
          criado_por: string;
          reservado_por: string | null;
          criado_em: string;
        };
        Insert: {
          event_id: string;
          nome: string;
          criado_por: string;
        };
      };
      event_photos: {
        Row: {
          id: string;
          event_id: string;
          autor_id: string;
          foto_url: string;
          visibilidade: "evento" | "publica";
          criado_em: string;
        };
        Insert: {
          event_id: string;
          autor_id: string;
          foto_url: string;
          visibilidade: "evento" | "publica";
        };
      };
      event_likes: {
        Row: { event_id: string; user_id: string; criado_em: string };
        Insert: { event_id: string; user_id: string };
      };
      event_photo_likes: {
        Row: { photo_id: string; user_id: string; criado_em: string };
        Insert: { photo_id: string; user_id: string };
      };
      event_photo_comments: {
        Row: {
          id: string;
          photo_id: string;
          autor_id: string;
          texto: string;
          criado_em: string;
        };
        Insert: {
          photo_id: string;
          autor_id: string;
          texto: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          event_id: string;
          autor_id: string;
          texto: string;
          criado_em: string;
        };
        Insert: {
          event_id: string;
          autor_id: string;
          texto: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          event_id: string;
          avaliador_id: string;
          avaliado_id: string;
          nota: number;
          comentario: string | null;
          criado_em: string;
        };
        Insert: {
          event_id: string;
          avaliador_id: string;
          avaliado_id: string;
          nota: number;
          comentario: string | null;
        };
      };
      invites: {
        Row: {
          id: string;
          event_id: string;
          criado_por: string;
          codigo: string;
          uso: "unico" | "multiplo";
          expira_em: string | null;
          usado_por: string[];
          criado_em: string;
        };
        Insert: {
          event_id: string;
          criado_por: string;
          uso: "unico" | "multiplo";
          expira_em: string | null;
          usado_por?: string[];
        };
      };
      reports: {
        Row: {
          id: string;
          denunciante_id: string;
          denunciado_id: string | null;
          event_id: string | null;
          motivo: string;
          status: "pendente" | "em_analise" | "resolvido";
          criado_em: string;
        };
        Insert: {
          denunciante_id: string;
          denunciado_id: string | null;
          event_id: string | null;
          motivo: string;
        };
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          criado_em: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: "pendente" | "aceito";
          criado_em: string;
          respondido_em: string | null;
        };
        Insert: {
          requester_id: string;
          addressee_id: string;
        };
      };
      friend_groups: {
        Row: {
          id: string;
          owner_id: string;
          nome: string;
          is_system: boolean;
          criado_em: string;
        };
        Insert: {
          owner_id: string;
          nome: string;
          is_system: boolean;
        };
      };
      friend_group_members: {
        Row: {
          group_id: string;
          friend_user_id: string;
          criado_em: string;
        };
        Insert: {
          group_id: string;
          friend_user_id: string;
        };
      };
      groups: {
        Row: {
          id: string;
          criador_id: string;
          nome: string;
          descricao: string | null;
          foto_url: string | null;
          criado_em: string;
        };
        Insert: {
          criador_id: string;
          nome: string;
          descricao?: string | null;
          foto_url?: string | null;
        };
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          papel: "admin" | "membro";
          entrou_em: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          papel?: "admin" | "membro";
        };
      };
      group_invites: {
        Row: {
          id: string;
          group_id: string;
          criado_por: string;
          codigo: string;
          ativo: boolean;
          criado_em: string;
        };
        Insert: {
          group_id: string;
          criado_por: string;
          ativo?: boolean;
        };
      };
      event_announcements: {
        Row: {
          id: string;
          event_id: string;
          autor_id: string;
          texto: string;
          criado_em: string;
        };
        Insert: {
          event_id: string;
          autor_id: string;
          texto: string;
        };
      };
      categories: {
        Row: {
          id: string;
          nome: string;
          emoji: string;
          cor: string;
          ordem: number;
          ativo: boolean;
          criado_em: string;
        };
        Insert: {
          id: string;
          nome: string;
          emoji: string;
          cor: string;
          ordem?: number;
          ativo?: boolean;
        };
        Update: Partial<{
          nome: string;
          emoji: string;
          cor: string;
          ordem: number;
          ativo: boolean;
        }>;
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          tipo: "session_start" | "page_view" | "heartbeat";
          path: string | null;
          criado_em: string;
        };
        Insert: {
          user_id: string | null;
          session_id: string;
          tipo: "session_start" | "page_view" | "heartbeat";
          path?: string | null;
        };
      };
    };
    Functions: {
      get_own_profile: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      admin_get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: AdminDashboardStats;
      };
      commit_to_event: {
        Args: { p_event_id: string };
        Returns: Database["public"]["Tables"]["commitments"]["Row"];
      };
      cancel_commitment: {
        Args: { p_event_id: string };
        Returns: void;
      };
      checkin_event: {
        Args: { p_event_id: string; p_lat: number; p_lng: number };
        Returns: Database["public"]["Tables"]["commitments"]["Row"];
      };
      redeem_invite: {
        Args: { p_codigo: string };
        Returns: string;
      };
      confirm_payment: {
        Args: { p_event_id: string };
        Returns: void;
      };
      create_group: {
        Args: { p_nome: string; p_descricao?: string | null };
        Returns: Database["public"]["Tables"]["groups"]["Row"];
      };
      redeem_group_invite: {
        Args: { p_codigo: string };
        Returns: string;
      };
    };
  };
}
