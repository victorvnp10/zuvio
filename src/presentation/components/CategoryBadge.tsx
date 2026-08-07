import type { EventCategory } from "../../domain/entities/types";

const LABELS: Record<EventCategory, string> = {
  esporte: "🏃 Esporte",
  viagem: "✈️ Viagem",
  hobby: "🎨 Hobby",
  encontro: "☕ Encontro",
  estudo: "📚 Estudo",
  outro: "✨ Outro",
};

export function CategoryBadge({ categoria }: { categoria: EventCategory }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-ink-800 text-ink-200 border border-ink-700">
      {LABELS[categoria]}
    </span>
  );
}

export const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = (
  Object.keys(LABELS) as EventCategory[]
).map((value) => ({ value, label: LABELS[value] }));
