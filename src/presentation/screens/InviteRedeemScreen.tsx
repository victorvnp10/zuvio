import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../application/context/AuthContext";
import { InvitesRepository } from "../../infrastructure/supabase/repositories/InvitesRepository";

export const PENDING_INVITE_KEY = "zuvio:pending_invite_code";

export function InviteRedeemScreen() {
  const { codigo } = useParams<{ codigo: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !codigo) return;

    if (!user) {
      // Ainda não tem conta (ou não está logado) — guarda o código e
      // manda para o cadastro/login. Depois de autenticar, o app
      // resgata sozinho (ver o efeito equivalente em App.tsx).
      sessionStorage.setItem(PENDING_INVITE_KEY, codigo);
      navigate("/entrar");
      return;
    }

    InvitesRepository.redeem(codigo)
      .then((eventId) => {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        navigate(`/eventos/${eventId}`, { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Convite inválido ou expirado.");
      });
  }, [codigo, user, loading, navigate]);

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-4 text-center">
      {error ? (
        <div className="space-y-3">
          <p className="text-red-400">{error}</p>
          <button onClick={() => navigate("/")} className="text-coral-500 font-semibold text-sm">
            Ir para o início
          </button>
        </div>
      ) : (
        <p className="text-ink-400">Confirmando seu convite...</p>
      )}
    </div>
  );
}
