import { useRef, useState } from "react";
import { Camera, Globe, Lock, Trash2 } from "lucide-react";
import { useEventPhotos } from "../../application/hooks/useEventPhotos";
import type { FotoVisibilidade } from "../../domain/entities/types";

export function EventPhotosSection({
  eventId,
  currentUserId,
  isCreator,
}: {
  eventId: string;
  currentUserId: string;
  isCreator: boolean;
}) {
  const { photos, isUploading, error, uploadPhoto, removePhoto } = useEventPhotos(eventId);
  const [visibilidade, setVisibilidade] = useState<FotoVisibilidade>("evento");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto(file, currentUserId, visibilidade);
    e.target.value = "";
  };

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">Fotos do evento</h3>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-ink-900 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setVisibilidade("evento")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              visibilidade === "evento" ? "bg-coral-500 text-ink-950" : "text-ink-400"
            }`}
          >
            <Lock size={12} /> Só do evento
          </button>
          <button
            onClick={() => setVisibilidade("publica")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              visibilidade === "publica" ? "bg-coral-500 text-ink-950" : "text-ink-400"
            }`}
          >
            <Globe size={12} /> Pública
          </button>
        </div>

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

      <p className="text-xs text-ink-500">
        {visibilidade === "evento"
          ? "Só quem participou deste evento vê essa foto."
          : "Qualquer pessoa pode ver essa foto (aparece marcada como pública)."}
      </p>

      {photos.length === 0 && (
        <p className="text-sm text-ink-500 text-center py-2">Nenhuma foto postada ainda.</p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
              <img src={photo.fotoUrl} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 bg-ink-950/70 rounded-full p-1">
                {photo.visibilidade === "publica" ? (
                  <Globe size={10} className="text-quorum-500" />
                ) : (
                  <Lock size={10} className="text-ink-300" />
                )}
              </span>
              {(photo.autorId === currentUserId || isCreator) && (
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute bottom-1 right-1 bg-ink-950/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remover foto"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
