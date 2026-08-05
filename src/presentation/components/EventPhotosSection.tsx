import { useEffect, useRef, useState } from "react";
import { Camera, Globe, Lock, Trash2, Heart, MessageCircle, Send } from "lucide-react";
import { useEventPhotos } from "../../application/hooks/useEventPhotos";
import { usePhotoComments } from "../../application/hooks/usePhotoComments";
import { PhotoInteractionsRepository } from "../../infrastructure/supabase/repositories/PhotoInteractionsRepository";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { Avatar } from "./Avatar";
import type { EventPhoto } from "../../domain/entities/types";

function CommentAuthorName({ userId }: { userId: string }) {
  const { data: profile } = usePublicProfile(userId);
  return <span className="font-semibold text-ink-100">{profile?.nome ?? "..."}</span>;
}

function PhotoPost({
  photo,
  currentUserId,
  isCreator,
  onRemove,
}: {
  photo: EventPhoto;
  currentUserId: string;
  isCreator: boolean;
  onRemove: () => void;
}) {
  const { data: autor } = usePublicProfile(photo.autorId);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { comments, isSending, addComment } = usePhotoComments(photo.id, commentsOpen);

  useEffect(() => {
    PhotoInteractionsRepository.listLikerIdsForPhotos([photo.id]).then((byPhoto) => {
      const likers = byPhoto[photo.id] ?? [];
      setIsLiked(likers.includes(currentUserId));
      setLikeCount(likers.length);
    });
  }, [photo.id, currentUserId]);

  const toggleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      if (wasLiked) await PhotoInteractionsRepository.unlikePhoto(photo.id, currentUserId);
      else await PhotoInteractionsRepository.likePhoto(photo.id, currentUserId);
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    }
  };

  const handleSendComment = async () => {
    if (!draft.trim()) return;
    await addComment(currentUserId, draft);
    setDraft("");
  };

  return (
    <div className="bg-ink-900 border border-ink-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <Avatar fotoUrl={autor?.fotoUrl} nome={autor?.nome} size={26} />
        <p className="text-xs text-ink-300 flex-1">
          <span className="font-semibold text-ink-100">{autor?.nome ?? "..."}</span>
        </p>
        {(photo.autorId === currentUserId || isCreator) && (
          <button onClick={onRemove} aria-label="Remover foto">
            <Trash2 size={14} className="text-ink-600 hover:text-red-400" />
          </button>
        )}
      </div>

      <img src={photo.fotoUrl} alt="" className="w-full aspect-square object-cover" />

      <div className="flex items-center gap-3 px-3 pt-2">
        <button onClick={toggleLike} aria-label="Curtir foto">
          <Heart size={22} strokeWidth={1.8} className={isLiked ? "fill-coral-500 text-coral-500" : "text-ink-200"} />
        </button>
        <button onClick={() => setCommentsOpen((v) => !v)} aria-label="Comentar foto">
          <MessageCircle size={22} strokeWidth={1.8} className="text-ink-200" />
        </button>
      </div>

      {likeCount > 0 && (
        <p className="text-xs font-semibold text-ink-200 px-3 pt-1.5">
          {likeCount} curtida{likeCount === 1 ? "" : "s"}
        </p>
      )}

      {commentsOpen && (
        <div className="px-3 pt-1.5 pb-3 space-y-1.5">
          {comments.map((c) => (
            <p key={c.id} className="text-xs text-ink-300">
              <CommentAuthorName userId={c.autorId} /> {c.texto}
            </p>
          ))}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              placeholder="Adicione um comentário..."
              className="flex-1 bg-ink-800 border border-ink-700 rounded-full px-3 py-1.5 text-xs text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
            />
            <button onClick={handleSendComment} disabled={isSending || !draft.trim()}>
              <Send size={16} className="text-coral-500" />
            </button>
          </div>
        </div>
      )}
      {!commentsOpen && <div className="pb-2" />}
    </div>
  );
}

/**
 * A visibilidade das fotos NÃO é mais escolha de quem posta — é
 * decisão do organizador, no nível do evento inteiro
 * (`event.fotosPublicas`, definida na criação/edição do evento). Aqui
 * só mostramos essa decisão (com atalho pro organizador mudar sem
 * precisar ir em "editar evento") e o botão de postar.
 */
export function EventPhotosSection({
  eventId,
  currentUserId,
  isCreator,
  fotosPublicas,
  onVisibilityChanged,
}: {
  eventId: string;
  currentUserId: string;
  isCreator: boolean;
  fotosPublicas: boolean;
  onVisibilityChanged?: (fotosPublicas: boolean) => void;
}) {
  const { photos, isUploading, error, uploadPhoto, removePhoto } = useEventPhotos(eventId);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto(file, currentUserId);
    e.target.value = "";
  };

  const handleToggleVisibility = async () => {
    setIsTogglingVisibility(true);
    try {
      await EventsRepository.update(eventId, { fotosPublicas: !fotosPublicas });
      onVisibilityChanged?.(!fotosPublicas);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">Fotos do evento</h3>
      </div>

      <div className="flex items-center gap-2">
        {isCreator ? (
          <button
            onClick={handleToggleVisibility}
            disabled={isTogglingVisibility}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-300 bg-ink-900 border border-ink-800 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
          >
            {fotosPublicas ? <Globe size={12} /> : <Lock size={12} />}
            {fotosPublicas ? "Públicas — mudar" : "Só participantes — mudar"}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
            {fotosPublicas ? <Globe size={12} /> : <Lock size={12} />}
            {fotosPublicas ? "Fotos públicas" : "Só para participantes"}
          </span>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 text-xs font-semibold bg-ink-700 disabled:opacity-50 text-ink-100 px-3 py-1.5 rounded-lg ml-auto"
        >
          <Camera size={14} /> {isUploading ? "Enviando..." : "Postar foto"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {photos.length === 0 && (
        <p className="text-sm text-ink-500 text-center py-2">Nenhuma foto postada ainda.</p>
      )}

      <div className="space-y-3">
        {photos.map((photo) => (
          <PhotoPost
            key={photo.id}
            photo={photo}
            currentUserId={currentUserId}
            isCreator={isCreator}
            onRemove={() => removePhoto(photo.id)}
          />
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
