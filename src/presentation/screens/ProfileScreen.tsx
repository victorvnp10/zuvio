import { AppShell } from "../layout/AppShell";
import { useAuth } from "../../application/context/AuthContext";
import { TrustBadgePill } from "../components/TrustBadge";
import { LogOut } from "lucide-react";

export function ProfileScreen() {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return (
      <AppShell title="Perfil">
        <p className="text-ink-400">Carregando perfil...</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Perfil">
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-coral-500 to-coral-600 flex items-center justify-center text-3xl font-display font-bold text-ink-950">
          {profile.nome.charAt(0).toUpperCase()}
        </div>
        <h2 className="font-display text-xl font-semibold mt-3">{profile.nome}</h2>
        <p className="text-sm text-ink-400">{profile.localizacaoBase}</p>
        <div className="mt-3">
          <TrustBadgePill selo={profile.selo} scoreConfiabilidade={profile.scoreConfiabilidade} />
        </div>
      </div>

      {profile.categoriasInteresse.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {profile.categoriasInteresse.map((cat) => (
            <span key={cat} className="text-xs px-2.5 py-1 rounded-full bg-ink-800 text-ink-300">
              {cat}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 border border-ink-700 text-ink-300 font-semibold py-3 rounded-xl mt-6"
      >
        <LogOut size={18} /> Sair
      </button>
    </AppShell>
  );
}
