import { useEffect, useState } from "react";
import { EventLikesRepository } from "../../infrastructure/supabase/repositories/EventLikesRepository";
import { useEventLikeToggle } from "./useEventLikeToggle";

export function useEventLikeState(eventId: string, userId: string) {
  const [likerIds, setLikerIds] = useState<string[]>([]);
  const { toggle, isPending } = useEventLikeToggle(eventId, userId);

  useEffect(() => {
    EventLikesRepository.listLikerIds(eventId).then(setLikerIds);
  }, [eventId]);

  const isLiked = likerIds.includes(userId);

  const handleToggle = async () => {
    const wasLiked = isLiked;
    setLikerIds((prev) => (wasLiked ? prev.filter((id) => id !== userId) : [...prev, userId]));
    await toggle(wasLiked).catch(() => {
      setLikerIds((prev) => (wasLiked ? [...prev, userId] : prev.filter((id) => id !== userId)));
    });
  };

  return { isLiked, likeCount: likerIds.length, toggle: handleToggle, isPending };
}
