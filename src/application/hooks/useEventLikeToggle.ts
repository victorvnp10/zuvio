import { useCallback, useState } from "react";
import { EventLikesRepository } from "../../infrastructure/supabase/repositories/EventLikesRepository";

export function useEventLikeToggle(eventId: string, userId: string) {
  const [isPending, setIsPending] = useState(false);

  const toggle = useCallback(
    async (currentlyLiked: boolean) => {
      setIsPending(true);
      try {
        if (currentlyLiked) {
          await EventLikesRepository.unlike(eventId, userId);
        } else {
          await EventLikesRepository.like(eventId, userId);
        }
      } finally {
        setIsPending(false);
      }
    },
    [eventId, userId]
  );

  return { toggle, isPending };
}
