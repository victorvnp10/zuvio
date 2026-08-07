import { useQuery } from "@tanstack/react-query";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";
import type { EventCategory } from "../../domain/entities/types";

export function useDiscoveryFeed(categoria?: EventCategory) {
  return useQuery({
    queryKey: ["discovery-feed", categoria ?? "todas"],
    queryFn: () => EventsRepository.listDiscoveryFeed({ categoria }),
    staleTime: 30_000,
  });
}
