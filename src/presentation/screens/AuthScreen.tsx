import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../application/context/AuthContext";
import { isOfMinimumAge, MINIMUM_AGE } from "../../domain/valueObjects/Eligibility";

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [localizacaoBase, setLocalizacaoBase] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && !isOfMinimumAge(dataNascimento, new Date().toISOString().slice(0, 10))) {
      setError(`Você precisa ter pelo menos ${MINIMUM_AGE} anos para usar o Zuvio.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp({ email, password, nome, dataNascimentoISO: dataNascimento, genero, localizacaoBase });
      }
      const pendingInviteCode = sessionStorage.getItem("zuvio:pending_invite_code");
      navigate(pendingInviteCode ? `/convite/${pendingInviteCode}` : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-coral-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm bg-ink-800/60 border border-ink-700 rounded-3xl shadow-2xl p-8 space-y-6 relative">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-ink-100">Zuvio</h1>
          <p className="text-sm text-ink-400 mt-1">
            Eventos que só acontecem com compromisso real.
          </p>
        </div>

        <div className="flex bg-ink-900 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isLogin ? "bg-coral-500 text-ink-950" : "text-ink-400"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              !isLogin ? "bg-coral-500 text-ink-950" : "text-ink-400"
            }`}
          >
            Criar conta
          </button>
        </div>

        <button
          type="button"
          onClick={() => signInWithGoogle().catch((err) => setError(err.message))}
          className="w-full flex items-center justify-center gap-2 bg-ink-100 hover:bg-white text-ink-950 font-semibold py-3 rounded-xl transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.29v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.29a12 12 0 0 0 0 10.8z" />
            <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.6l4 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
          </svg>
          Continuar com Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-ink-700" />
          <span className="text-xs text-ink-500">ou</span>
          <div className="flex-1 h-px bg-ink-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
              />
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
              <input
                type="text"
                placeholder="Cidade/região onde você está"
                value={localizacaoBase}
                onChange={(e) => setLocalizacaoBase(e.target.value)}
                required
                className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
              />
              <div>
                <label className="block text-xs text-ink-400 mb-1">Gênero (opcional)</label>
                <input
                  type="text"
                  placeholder="Como você se identifica (opcional)"
                  value={genero}
                  onChange={(e) => setGenero(e.target.value)}
                  className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-ink-900 border border-ink-700 rounded-xl p-3 text-ink-100 placeholder:text-ink-500 focus:border-coral-500 focus:outline-none"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-ink-950 font-semibold py-3 rounded-xl transition-colors"
          >
            {isSubmitting ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
