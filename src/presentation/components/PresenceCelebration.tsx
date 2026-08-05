const COLORS = ["#FF6B4A", "#12E0B2", "#F0A93A", "#EFF1FA", "#FF8C6E"];
const PIECES = Array.from({ length: 14 }, (_, i) => ({
  left: `${6 + i * 6.5}%`,
  color: COLORS[i % COLORS.length],
  delay: `${(i % 6) * 0.045}s`,
}));

/** Comemoração ao confirmar presença — distinta da chuva de confete de
 * quórum (`Confetti`, um momento coletivo): estoura de baixo pra cima
 * como um brinde e some rápido, marcando o momento individual de "eu
 * confirmei". */
export function PresenceCelebration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" aria-hidden>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="presence-burst-piece"
          style={{ left: p.left, backgroundColor: p.color, animationDelay: p.delay }}
        />
      ))}
      <span className="presence-pop-emoji">🍾</span>
    </div>
  );
}
