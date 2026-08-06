import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AnalyticsRepository } from "../../infrastructure/supabase/repositories/AnalyticsRepository";
import { EventsRepository } from "../../infrastructure/supabase/repositories/EventsRepository";

const SESSION_KEY = "zuvio_analytics_session_id";
const SESSION_STARTED_KEY = "zuvio_analytics_session_started";
/** Sem app nativo nem "beacon" confiável de fechar aba em todo
 * navegador, tempo em app é estimado por heartbeat: um evento a cada
 * 60s enquanto a aba está visível. O painel admin calcula a duração de
 * cada sessão pelo intervalo entre o primeiro e o último evento dela —
 * aproximação real a partir de dados reais, não um número inventado. */
const HEARTBEAT_INTERVAL_MS = 60_000;

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Um id por aba/sessão de navegador (não por usuário) — só grava
 * eventos enquanto há alguém logado, já que quase todo o app exige
 * login mesmo (ver RequireAuth em App.tsx). */
export function useAnalyticsTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const [sessionId] = useState(getOrCreateSessionId);

  useEffect(() => {
    // Em sessionStorage (não só num ref em memória) para não duplicar
    // se a aba der um reload de página inteira (F5) — o id da sessão
    // sobrevive ao reload, então o "já começou" precisa sobreviver
    // junto, senão cada F5 vira uma nova linha de session_start com o
    // mesmo session_id.
    if (!user || sessionStorage.getItem(SESSION_STARTED_KEY) === sessionId) return;
    sessionStorage.setItem(SESSION_STARTED_KEY, sessionId);
    AnalyticsRepository.track(user.id, sessionId, "session_start");

    // Varredura best-effort de eventos vencidos (marca 'concluido' e
    // vira 'no-show' quem confirmou e nunca fez check-in) — não há
    // pg_cron configurado, então isso roda "de carona" uma vez por
    // sessão de qualquer usuário logado. Idempotente e barato o
    // suficiente pra não precisar de agendamento de verdade.
    EventsRepository.concludePastEvents().catch((err) => {
      console.warn("[analytics] falha ao concluir eventos vencidos:", err);
    });
  }, [user, sessionId]);

  useEffect(() => {
    if (!user) return;
    AnalyticsRepository.track(user.id, sessionId, "page_view", location.pathname);
  }, [user, sessionId, location.pathname]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        AnalyticsRepository.track(user.id, sessionId, "heartbeat", location.pathname);
      }
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, sessionId, location.pathname]);
}
