import { useCallback, useRef, useState } from "react";

/**
 * Trigger imperativo, diferente de `useQuorumCelebration` (que observa
 * a transição de uma prop): "eu confirmei presença" é uma ação pontual
 * do próprio usuário, não um estado derivado observável de fora.
 */
export function usePresenceCelebration() {
  const [celebrating, setCelebrating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const celebrate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCelebrating(true);
    timerRef.current = setTimeout(() => setCelebrating(false), 1500);
  }, []);

  return { celebrating, celebrate };
}
