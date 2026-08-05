import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../application/context/AuthContext";
import { GroupsRepository } from "../../infrastructure/supabase/repositories/GroupsRepository";

export const PENDING_GROUP_INVITE_KEY = "zuvio:pending_group_invite_code";

/** Mesmo padrão do InviteRedeemScreen (eventos): resgata direto se já
 * tem conta, ou guarda o código e manda pro cadastro/login antes. */
export function GroupInviteRedeemScreen() {
  const { codigo } = useParams<{ codigo: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !codigo) return;

    if (!user) {
      sessionStorage.setItem(PENDING_GROUP_INVITE_KEY, codigo);
      navigate("/entrar");
      return;
    }

    GroupsRepository.redeemInvite(codigo)
      .then((groupId) => {
        sessionStorage.removeItem(PENDING_GROUP_INVITE_KEY);
        navigate(`/grupos/${groupId}`, { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Convite inválido ou revogado.");
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
