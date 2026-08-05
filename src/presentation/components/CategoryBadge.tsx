import type { EventCategory } from "../../domain/entities/types";

const LABELS: Record<EventCategory, string> = {
  esporte: "🏃 Esporte",
  viagem: "✈️ Viagem",
  hobby: "🎨 Hobby",
  encontro: "☕ Encontro",
  estudo: "📚 Estudo",
  outro: "✨ Outro",
};

/** Gradiente + emoji por categoria — usado como capa do card enquanto
 * o app não tem upload de foto/vídeo do evento (fase 1 do roadmap). */
export const CATEGORY_COVER: Record<EventCategory, { gradient: string; emoji: string }> = {
  esporte: { gradient: "from-quorum-600 to-ink-800", emoji: "🏃" },
  viagem: { gradient: "from-coral-600 to-ink-800", emoji: "✈️" },
  hobby: { gradient: "from-amber-500 to-ink-800", emoji: "🎨" },
  encontro: { gradient: "from-ink-600 to-ink-800", emoji: "☕" },
  estudo: { gradient: "from-ink-500 to-ink-800", emoji: "📚" },
  outro: { gradient: "from-ink-700 to-ink-800", emoji: "✨" },
};

/** Cor sólida do pontinho de categoria (usado no selo flutuante sobre a imagem). */
export const CATEGORY_DOT: Record<EventCategory, string> = {
  esporte: "#12E0B2",
  viagem: "#FF6B4A",
  hobby: "#F0A93A",
  encontro: "#8A93B8",
  estudo: "#5A6491",
  outro: "#DCE0F0",
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
