import { useCallback, useState } from "react";
import { MediaStorageRepository } from "../../infrastructure/supabase/repositories/MediaStorageRepository";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";

export function useEventCover(eventId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadCover = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      try {
        const path = MediaStorageRepository.coverPath(eventId, file);
        const url = await MediaStorageRepository.uploadFile(path, file);
        await EventsRepository.update(eventId, { capaUrl: url });
        return url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a capa.");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [eventId]
  );

  return { uploadCover, isUploading, error };
}
