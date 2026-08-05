import { useCallback, useEffect, useState } from "react";
import { EventPhotosRepository } from "../../infrastructure/supabase/repositories/EventPhotosRepository";
import { MediaStorageRepository } from "../../infrastructure/supabase/repositories/MediaStorageRepository";
import type { EventPhoto } from "../../domain/entities/types";

export function useEventPhotos(eventId: string | undefined) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const data = await EventPhotosRepository.listForEvent(eventId);
      setPhotos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar as fotos.");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const uploadPhoto = useCallback(
    async (file: File, autorId: string) => {
      if (!eventId) return;
      setIsUploading(true);
      setError(null);
      try {
        const path = MediaStorageRepository.photoPath(eventId, file);
        const url = await MediaStorageRepository.uploadFile(path, file);
        await EventPhotosRepository.addPhoto(eventId, autorId, url);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
      } finally {
        setIsUploading(false);
      }
    },
    [eventId, reload]
  );

  const removePhoto = useCallback(
    async (photoId: string) => {
      setError(null);
      try {
        await EventPhotosRepository.removePhoto(photoId);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível remover a foto.");
      }
    },
    [reload]
  );

  return { photos, isLoading, isUploading, error, uploadPhoto, removePhoto };
}
