import { supabase } from "../client";
import { compressImage } from "../../../shared/imageCompression";

const BUCKET = "event-media";

export const MediaStorageRepository = {
  /** Envia um arquivo (comprimindo antes, se for imagem) e devolve a URL pública. */
  async uploadFile(path: string, file: File): Promise<string> {
    const compressed = await compressImage(file);

    const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
      upsert: true,
      contentType: compressed.type,
    });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  coverPath(eventId: string, file: File): string {
    const ext = file.name.split(".").pop() || "jpg";
    return `covers/${eventId}.${ext}`;
  },

  photoPath(eventId: string, file: File): string {
    const ext = file.name.split(".").pop() || "jpg";
    const randomId = crypto.randomUUID();
    return `photos/${eventId}/${randomId}.${ext}`;
  },
};
