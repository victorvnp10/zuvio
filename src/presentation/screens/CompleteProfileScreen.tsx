import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../application/context/AuthContext";
import { ProfileRepository } from "../../infrastructure/supabase/repositories/ProfileRepository";
import { isOfMinimumAge, MINIMUM_AGE } from "../../domain/valueObjects/Eligibility";

export function CompleteProfileScreen() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [dataNascimento, setDataNascimento] = useState("");
  const [localizacaoBase, setLocalizacaoBase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isOfMinimumAge(dataNascimento, new Date().toISOString().slice(0, 10))) {
      setError(`Você precisa ter pelo menos ${MINIMUM_AGE} anos para usar o Zuvio.`);
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      await ProfileRepository.update(user.id, { dataNascimento, localizacaoBase });
      await refreshProfile();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-ink-800/60 border border-ink-700 rounded-3xl p-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold">Falta pouco</h1>
          <p className="text-sm text-ink-400 mt-1">
            Precisamos de mais duas informações antes de você continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-ink-400 mb-1">Data de nascimento</label>
            <input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              required
              className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
            <p className="text-xs text-ink-500 mt-1">
              Nunca é exibida publicamente — só para confirmar que você tem {MINIMUM_AGE}+ anos.
            </p>
          </div>

          <div>
            <label className="block text-xs text-ink-400 mb-1">Cidade/região onde você está</label>
            <input
              type="text"
              value={localizacaoBase}
              onChange={(e) => setLocalizacaoBase(e.target.value)}
              required
              className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 focus:border-coral-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-ink-950 font-semibold py-3 rounded-xl transition-colors"
          >
            {isSubmitting ? "Salvando..." : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
