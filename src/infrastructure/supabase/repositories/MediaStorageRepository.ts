import { supabase } from "../client";

const BUCKET = "event-media";

export const MediaStorageRepository = {
  /** Envia um arquivo e devolve a URL pública para salvar em `events.capa_url` ou `event_photos.foto_url`. */
  async uploadFile(path: string, file: File): Promise<string> {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
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
