const COLORS = ["#FF6B4A", "#12E0B2", "#F0A93A"];
const PIECES = Array.from({ length: 10 }, (_, i) => ({
  left: `${8 + i * 9}%`,
  color: COLORS[i % COLORS.length],
  delay: `${(i % 4) * 0.06}s`,
}));

export function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" aria-hidden>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}
