import { supabase } from "../client";
import { toCategory } from "../mappers";
import type { Category } from "../../../domain/entities/types";

export const CategoriesRepository = {
  /** Categorias ativas, na ordem definida pelo admin — para telas de criação/feed. */
  async listAtivas(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCategory);
  },

  /** Todas (inclusive inativas) — só o admin enxerga via RLS. */
  async listTodas(): Promise<Category[]> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toCategory);
  },

  async create(input: { id: string; nome: string; emoji: string; cor: string; ordem: number }): Promise<Category> {
    const { data, error } = await supabase
      .from("categories")
      .insert({ id: input.id, nome: input.nome, emoji: input.emoji, cor: input.cor, ordem: input.ordem })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toCategory(data);
  },

  async setAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase.from("categories").update({ ativo }).eq("id", id);
    if (error) throw new Error(error.message);
  },
};
