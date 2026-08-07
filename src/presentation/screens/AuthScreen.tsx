import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../application/context/AuthContext";
import { isOfMinimumAge, MINIMUM_AGE } from "../../domain/valueObjects/Eligibility";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
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
      navigate("/");
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
