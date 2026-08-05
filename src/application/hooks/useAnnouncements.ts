import { useCallback, useEffect, useState } from "react";
import { AnnouncementsRepository } from "../../infrastructure/supabase/repositories/AnnouncementsRepository";
import type { EventAnnouncement } from "../../domain/entities/types";

export function useAnnouncements(eventId: string | undefined) {
  const [announcements, setAnnouncements] = useState<EventAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    setIsLoading(true);
    AnnouncementsRepository.listForEvent(eventId)
      .then((data) => {
        if (isMounted) setAnnouncements(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar os avisos."))
      .finally(() => setIsLoading(false));

    const unsubscribe = AnnouncementsRepository.subscribeToAnnouncements(eventId, (announcement) => {
      setAnnouncements((prev) =>
        prev.some((a) => a.id === announcement.id) ? prev : [announcement, ...prev]
      );
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [eventId]);

  const postAnnouncement = useCallback(
    async (autorId: string, texto: string) => {
      if (!eventId || !texto.trim()) return;
      setIsPosting(true);
      setError(null);
      try {
        await AnnouncementsRepository.post(eventId, autorId, texto.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível publicar o aviso.");
      } finally {
        setIsPosting(false);
      }
    },
    [eventId]
  );

  const removeAnnouncement = useCallback(async (announcementId: string) => {
    try {
      await AnnouncementsRepository.remove(announcementId);
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível apagar o aviso.");
    }
  }, []);

  return { announcements, isLoading, isPosting, error, postAnnouncement, removeAnnouncement };
}
