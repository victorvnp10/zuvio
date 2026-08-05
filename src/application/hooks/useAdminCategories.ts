import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CategoriesRepository } from "../../infrastructure/supabase/repositories/CategoriesRepository";

/** Slug estável a partir do nome digitado — vira o id da categoria
 * (chave de `events.categoria`), então precisa ser único e sem
 * acento/espaço. Se colidir com uma categoria existente, o INSERT
 * falha com erro de chave duplicada — a tela mostra a mensagem. */
function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function useAdminCategories() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => CategoriesRepository.listTodas(),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }, [queryClient]);

  const createCategory = useCallback(
    async (input: { nome: string; emoji: string; cor: string; ordem: number }): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const id = slugify(input.nome);
        if (!id) throw new Error("Nome inválido para gerar o identificador da categoria.");
        await CategoriesRepository.create({ id, ...input });
        invalidate();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível criar a categoria.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [invalidate]
  );

  const setAtivo = useCallback(
    async (id: string, ativo: boolean): Promise<boolean> => {
      setError(null);
      try {
        await CategoriesRepository.setAtivo(id, ativo);
        invalidate();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível atualizar a categoria.");
        return false;
      }
    },
    [invalidate]
  );

  return { ...query, createCategory, setAtivo, isSubmitting, error };
}
