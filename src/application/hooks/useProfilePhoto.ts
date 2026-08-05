import { useCallback, useState } from "react";
import { MediaStorageRepository } from "../../infrastructure/supabase/repositories/MediaStorageRepository";
import { ProfileRepository } from "../../infrastructure/supabase/repositories/ProfileRepository";

export function useProfilePhoto(userId: string, onUpdated: () => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const url = await MediaStorageRepository.uploadFile(`profiles/${userId}.${ext}`, file);
        await ProfileRepository.update(userId, { fotoUrl: url });
        onUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
      } finally {
        setIsUploading(false);
      }
    },
    [userId, onUpdated]
  );

  return { uploadPhoto, isUploading, error };
}
