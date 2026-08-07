import { supabase } from "../client";
import { toProfile } from "../mappers";
import type { Profile } from "../../../domain/entities/types";
import type { Database } from "../database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const ProfileRepository = {
  /**
   * Perfil completo (com data de nascimento) — só para o dono ver o
   * próprio. Passa por `get_own_profile()` (RPC `security definer`)
   * porque a coluna `data_nascimento` não tem GRANT de SELECT direto
   * na tabela para `authenticated`/`anon` — só assim dá pra ler o
   * próprio valor sem abrir a coluna pra qualquer usuário logado.
   */
  async getOwn(): Promise<Profile | null> {
    const { data, error } = await supabase.rpc("get_own_profile").single<ProfileRow>();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }
    return toProfile(data);
  },

  /** Perfil público (sem data de nascimento) — para exibir o perfil de outra pessoa. */
  async getPublic(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }
    return toProfile(data);
  },

  async update(
    userId: string,
    changes: Partial<
      Pick<
        Profile,
        "nome" | "fotoUrl" | "genero" | "localizacaoBase" | "categoriasInteresse" | "dataNascimento"
      >
    >
  ): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (changes.nome !== undefined) patch.nome = changes.nome;
    if (changes.fotoUrl !== undefined) patch.foto_url = changes.fotoUrl;
    if (changes.genero !== undefined) patch.genero = changes.genero;
    if (changes.localizacaoBase !== undefined) patch.localizacao_base = changes.localizacaoBase;
    if (changes.categoriasInteresse !== undefined) patch.categorias_interesse = changes.categoriasInteresse;
    if (changes.dataNascimento !== undefined) patch.data_nascimento = changes.dataNascimento;

    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
  },
};
