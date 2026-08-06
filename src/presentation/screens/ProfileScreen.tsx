import { Camera, LogOut } from "lucide-react";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../../application/context/AuthContext";
import { useProfilePhoto } from "../../application/hooks/useProfilePhoto";
import { useTrophies } from "../../application/hooks/useTrophies";
import { TrustBadgePill } from "../components/TrustBadge";
import { TrophyGrid } from "../components/TrophyGrid";
import { Avatar } from "../components/Avatar";

export function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { uploadPhoto, isUploading, error } = useProfilePhoto(user?.id ?? "", refreshProfile);
  const { progress: trophyProgress } = useTrophies();

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
        <label className="relative cursor-pointer group">
          <Avatar fotoUrl={profile.fotoUrl} nome={profile.nome} size={96} />
          <div className="absolute inset-0 rounded-full bg-ink-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera size={22} className="text-white" />
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file);
            }}
          />
        </label>
        {isUploading && <p className="text-xs text-ink-500 mt-2">Enviando...</p>}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        <h2 className="font-display text-xl font-semibold mt-3">{profile.nome}</h2>
        <p className="text-sm text-ink-400">{profile.localizacaoBase}</p>
        <div className="mt-3">
          <TrustBadgePill
            selo={profile.selo}
            scoreConfiabilidade={profile.scoreConfiabilidade}
            pontosReputacao={profile.pontosReputacao}
          />
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

      {trophyProgress && trophyProgress.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-ink-400 mb-2 uppercase tracking-wide">Troféus</h3>
          <TrophyGrid progress={trophyProgress} />
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
