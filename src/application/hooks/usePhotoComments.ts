import { useCallback, useEffect, useState } from "react";
import { PhotoInteractionsRepository } from "../../infrastructure/supabase/repositories/PhotoInteractionsRepository";
import type { PhotoComment } from "../../domain/entities/types";

export function usePhotoComments(photoId: string, expanded: boolean) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await PhotoInteractionsRepository.listComments(photoId);
      setComments(data);
    } finally {
      setIsLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    if (expanded) reload();
  }, [expanded, reload]);

  const addComment = useCallback(
    async (autorId: string, texto: string) => {
      if (!texto.trim()) return;
      setIsSending(true);
      try {
        await PhotoInteractionsRepository.addComment(photoId, autorId, texto.trim());
        await reload();
      } finally {
        setIsSending(false);
      }
    },
    [photoId, reload]
  );

  return { comments, isLoading, isSending, addComment };
}
