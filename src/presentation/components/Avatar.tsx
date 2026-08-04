export function Avatar({
  fotoUrl,
  nome,
  size = 32,
  ring = false,
}: {
  fotoUrl?: string | null;
  nome?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const initial = (nome ?? "?").charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-coral-500 to-coral-600 ${
        ring ? "ring-2 ring-coral-500 ring-offset-2 ring-offset-ink-900" : ""
      }`}
      style={{ width: size, height: size }}
    >
      {fotoUrl ? (
        <img src={fotoUrl} alt={nome ?? "Avatar"} className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-display font-semibold text-ink-950"
          style={{ fontSize: size * 0.4 }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
