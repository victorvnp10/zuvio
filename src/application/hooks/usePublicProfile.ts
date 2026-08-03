import { useQuery } from "@tanstack/react-query";
import { ProfileRepository } from "../../infrastructure/supabase/repositories/ProfileRepository";

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => ProfileRepository.getPublic(userId!),
    enabled: Boolean(userId),
  });
}
