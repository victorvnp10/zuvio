import { supabase } from "../client";
import { toProfile } from "../mappers";
import type { Profile } from "../../../domain/entities/types";

export const ProfileRepository = {
  /** Perfil completo (com data de nascimento) — só para o dono ver o próprio. */
  async getOwn(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
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
    changes: Partial<Pick<Profile, "nome" | "fotoUrl" | "genero" | "localizacaoBase" | "categoriasInteresse">>
  ): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: changes.nome,
        foto_url: changes.fotoUrl,
        genero: changes.genero,
        localizacao_base: changes.localizacaoBase,
        categorias_interesse: changes.categoriasInteresse,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  },
};
