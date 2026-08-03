/**
 * Tipos gerados manualmente a partir de `supabase/migrations/0001_initial_schema.sql`.
 *
 * Quando o projeto Supabase estiver criado, o ideal é substituir este
 * arquivo pelo gerado automaticamente:
 *   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/infrastructure/supabase/database.types.ts
 * Mantido manual por enquanto para o projeto compilar sem depender de
 * um projeto Supabase já provisionado.
 */

export type EventCategoryRow = "esporte" | "viagem" | "hobby" | "encontro" | "estudo" | "outro";
export type EventModalityRow = "estranhos" | "amigos" | "hibrida" | "restrita";
export type EventStatusRow =
  | "aberto"
  | "quorum_atingido"
  | "fechado"
  | "concluido"
  | "cancelado";
export type CommitmentStatusRow = "confirmado" | "check-in" | "no-show" | "cancelado";
export type TrustBadgeRow = "nenhum" | "bronze" | "prata" | "ouro";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          foto_url: string | null;
          data_nascimento: string;
          genero: string | null;
          localizacao_base: string;
          categorias_interesse: EventCategoryRow[];
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
          categoria: EventCategoryRow;
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
        };
        Insert: Omit<
          Database["public"]["Tables"]["events"]["Row"],
          "id" | "vagas_confirmadas" | "status" | "criado_em"
        >;
        Update: Partial<
          Pick<
            Database["public"]["Tables"]["events"]["Row"],
            "titulo" | "descricao" | "endereco" | "geo_lat" | "geo_lng" | "data_hora"
          >
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
    };
    Functions: {
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
    };
  };
}
