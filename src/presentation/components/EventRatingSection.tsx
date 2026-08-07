import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useEventRating } from "../../application/hooks/useEventRating";

/** Avaliação do evento como um todo — estrelas + opinião em texto,
 * diferente de `RatingSection` (que avalia OUTROS participantes).
 * Editável depois de enviada (mesmo padrão de `ActivityRatingWidget`
 * em `ConferenceScheduleSection.tsx`). */
export function EventRatingSection({ eventId }: { eventId: string }) {
  const { myRating, summary, rate, isSubmitting, error } = useEventRating(eventId);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!syncedRef.current && myRating !== undefined) {
      setNota(myRating?.nota ?? 0);
      setComentario(myRating?.comentario ?? "");
      syncedRef.current = true;
    }
  }, [myRating]);

  const isDirty =
    nota > 0 && (nota !== (myRating?.nota ?? 0) || comentario.trim() !== (myRating?.comentario ?? ""));

  const handleSubmit = async () => {
    if (nota === 0) return;
    await rate(nota, comentario.trim() || undefined);
  };

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink-100">Avalie o evento</p>
        {summary && summary.total > 0 && (
          <span className="text-xs text-ink-500">
            {summary.media?.toFixed(1)} ★ ({summary.total})
          </span>
        )}
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => setNota(star)} aria-label={`${star} estrelas`}>
            <Star size={22} className={star <= nota ? "fill-amber-500 text-amber-500" : "text-ink-600"} />
          </button>
        ))}
      </div>

      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        placeholder="O que você achou do evento? (opcional)"
        maxLength={1000}
        className="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none resize-none"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={nota === 0 || isSubmitting || !isDirty}
        className="w-full bg-coral-500 disabled:opacity-40 text-ink-950 font-semibold py-2 rounded-lg text-sm"
      >
        {myRating ? "Atualizar avaliação" : "Enviar avaliação"}
      </button>
    </div>
  );
}
