import { supabase } from "../client";
import type { Database } from "../database.types";
import type { PhotoComment } from "../../../domain/entities/types";

type CommentRow = Database["public"]["Tables"]["event_photo_comments"]["Row"];

const toComment = (row: CommentRow): PhotoComment => ({
  id: row.id,
  photoId: row.photo_id,
  autorId: row.autor_id,
  texto: row.texto,
  criadoEm: row.criado_em,
});

export const PhotoInteractionsRepository = {
  async listLikerIdsForPhotos(photoIds: string[]): Promise<Record<string, string[]>> {
    if (photoIds.length === 0) return {};
    const { data, error } = await supabase
      .from("event_photo_likes")
      .select("photo_id, user_id")
      .in("photo_id", photoIds);
    if (error) throw new Error(error.message);

    const byPhoto: Record<string, string[]> = {};
    for (const row of data ?? []) {
      byPhoto[row.photo_id] = [...(byPhoto[row.photo_id] ?? []), row.user_id];
    }
    return byPhoto;
  },

  async likePhoto(photoId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("event_photo_likes")
      .insert({ photo_id: photoId, user_id: userId });
    if (error) throw new Error(error.message);
  },

  async unlikePhoto(photoId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("event_photo_likes")
      .delete()
      .eq("photo_id", photoId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  async listComments(photoId: string): Promise<PhotoComment[]> {
    const { data, error } = await supabase
      .from("event_photo_comments")
      .select("*")
      .eq("photo_id", photoId)
      .order("criado_em", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toComment);
  },

  async addComment(photoId: string, autorId: string, texto: string): Promise<PhotoComment> {
    const { data, error } = await supabase
      .from("event_photo_comments")
      .insert({ photo_id: photoId, autor_id: autorId, texto })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toComment(data);
  },
};
