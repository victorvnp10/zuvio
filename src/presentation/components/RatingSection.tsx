import type { Commitment } from "../../domain/entities/types";
import { ParticipantRatingRow } from "./ParticipantRatingRow";

export function RatingSection({
  eventId,
  commitments,
  currentUserId,
}: {
  eventId: string;
  commitments: Commitment[];
  currentUserId: string;
}) {
  const others = commitments.filter(
    (c) => c.userId !== currentUserId && c.status === "check-in"
  );

  if (others.length === 0) {
    return (
      <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-4">
        <p className="text-sm text-ink-500">
          Nenhum outro participante fez check-in neste evento para avaliar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold">Avalie quem participou</h3>
      {others.map((c) => (
        <ParticipantRatingRow key={c.userId} eventId={eventId} userId={c.userId} />
      ))}
    </div>
  );
}
