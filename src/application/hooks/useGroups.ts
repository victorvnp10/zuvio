import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GroupsRepository } from "../../infrastructure/supabase/repositories/GroupsRepository";
import { useAuth } from "../context/AuthContext";

/** Grupos compartilhados (estilo WhatsApp) dos quais o usuário participa. */
export function useGroups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: ["my-groups", user?.id],
    queryFn: () => GroupsRepository.listMine(user!.id),
    enabled: Boolean(user),
  });

  const createGroup = useCallback(
    async (nome: string, descricao?: string) => {
      setError(null);
      try {
        const group = await GroupsRepository.create(nome, descricao);
        queryClient.invalidateQueries({ queryKey: ["my-groups", user?.id] });
        return group;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível criar o grupo.");
        return null;
      }
    },
    [queryClient, user?.id]
  );

  return {
    groups: groupsQuery.data ?? [],
    isLoading: groupsQuery.isLoading,
    error,
    createGroup,
  };
}
