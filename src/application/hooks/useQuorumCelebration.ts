import { useEffect, useRef, useState } from "react";

/**
 * Detecta quando `quorumAtingido` vira `true` (a transição, não o
 * estado em si) e devolve uma janela de ~1.8s para mostrar a
 * celebração (confete) — sem isso, o card "celebraria" toda vez que
 * fosse renderizado de novo com o quórum já atingido.
 */
export function useQuorumCelebration(quorumAtingido: boolean) {
  const [isCelebrating, setIsCelebrating] = useState(false);
  const previousRef = useRef(quorumAtingido);

  useEffect(() => {
    if (!previousRef.current && quorumAtingido) {
      setIsCelebrating(true);
      const timer = setTimeout(() => setIsCelebrating(false), 1800);
      previousRef.current = quorumAtingido;
      return () => clearTimeout(timer);
    }
    previousRef.current = quorumAtingido;
  }, [quorumAtingido]);

  return isCelebrating;
}
