import { useCategories, findCategory } from "../../application/hooks/useCategories";

/** Cor de base do gradiente da capa quando não há foto/capa própria —
 * mesma constante em todo lugar que monta o gradiente por categoria. */
const GRADIENT_END = "#1C2340";

export function categoryGradientStyle(cor: string): React.CSSProperties {
  return { background: `linear-gradient(135deg, ${cor}, ${GRADIENT_END})` };
}

export function CategoryBadge({ categoria }: { categoria: string }) {
  const { data: categories } = useCategories();
  const cat = findCategory(categories, categoria);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-ink-800 text-ink-200 border border-ink-700">
      {cat.emoji} {cat.nome}
    </span>
  );
}
