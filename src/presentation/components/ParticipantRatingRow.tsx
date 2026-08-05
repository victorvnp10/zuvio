import { useState } from "react";
import { Star } from "lucide-react";
import { usePublicProfile } from "../../application/hooks/usePublicProfile";
import { useSubmitRating } from "../../application/hooks/useSubmitRating";

export function ParticipantRatingRow({ eventId, userId }: { eventId: string; userId: string }) {
  const { data: profile } = usePublicProfile(userId);
  const { submitRating, isSubmitting } = useSubmitRating(eventId);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [sent, setSent] = useState(false);

  if (!profile) return null;

  const handleSubmit = async () => {
    if (nota === 0) return;
    await submitRating(userId, nota, comentario || undefined);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="bg-ink-800/60 border border-quorum-500/30 rounded-2xl p-4">
        <p className="text-sm text-quorum-500">✓ Você avaliou {profile.nome}</p>
      </div>
    );
  }

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4 space-y-3">
      <p className="font-medium text-ink-100">{profile.nome}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} onClick={() => setNota(star)} aria-label={`${star} estrelas`}>
            <Star
              size={22}
              className={star <= nota ? "fill-amber-500 text-amber-500" : "text-ink-600"}
            />
          </button>
        ))}
      </div>
      <input
        type="text"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Comentário (opcional)"
        className="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
      />
      <button
        onClick={handleSubmit}
        disabled={nota === 0 || isSubmitting}
        className="w-full bg-coral-500 disabled:opacity-40 text-ink-950 font-semibold py-2 rounded-lg text-sm"
      >
        Enviar avaliação
      </button>
    </div>
  );
}
