import { useQuery } from "@tanstack/react-query";
import { TrophiesRepository } from "../../infrastructure/supabase/repositories/TrophiesRepository";
import { useAuth } from "../context/AuthContext";
import type { Trophy } from "../../domain/entities/types";

export interface TrophyProgress {
  trophy: Trophy;
  conquistado: boolean;
  conquistadoEm: string | null;
}

/** Catálogo completo + o que o usuário já conquistou, combinados numa
 * lista única (na ordem do catálogo) pra a tela renderizar direto. */
export function useTrophies() {
  const { user } = useAuth();

  const catalogQuery = useQuery({
    queryKey: ["trophies-catalog"],
    queryFn: () => TrophiesRepository.listCatalog(),
    staleTime: 5 * 60_000,
  });

  const earnedQuery = useQuery({
    queryKey: ["trophies-earned", user?.id],
    enabled: Boolean(user),
    queryFn: () => TrophiesRepository.listEarned(user!.id),
  });

  const progress: TrophyProgress[] | undefined = catalogQuery.data?.map((trophy) => {
    const earned = earnedQuery.data?.find((e) => e.id === trophy.id);
    return { trophy, conquistado: Boolean(earned), conquistadoEm: earned?.conquistadoEm ?? null };
  });

  return {
    progress,
    isLoading: catalogQuery.isLoading || earnedQuery.isLoading,
  };
}
