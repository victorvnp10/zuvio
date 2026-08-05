import { useQuery } from "@tanstack/react-query";
import { CategoriesRepository } from "../../infrastructure/supabase/repositories/CategoriesRepository";
import type { Category } from "../../domain/entities/types";

/** Categorias ativas — usado nas telas de criar/editar evento e no
 * carrossel do feed. Cacheado por um bom tempo: o admin mexe nisso com
 * pouca frequência, não precisa refetch agressivo. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories", "ativas"],
    queryFn: () => CategoriesRepository.listAtivas(),
    staleTime: 5 * 60_000,
  });
}

const FALLBACK: Category = {
  id: "outro",
  nome: "Outro",
  emoji: "✨",
  cor: "#DCE0F0",
  ordem: 0,
  ativo: true,
  criadoEm: "",
};

/** Busca uma categoria pelo id na lista já carregada — com um fallback
 * visual sensato caso o id não seja (mais) encontrado, em vez de
 * quebrar a tela (ex.: categoria desativada depois que o evento já
 * existia com ela). */
export function findCategory(categories: Category[] | undefined, id: string): Category {
  return categories?.find((c) => c.id === id) ?? { ...FALLBACK, id, nome: id };
}
