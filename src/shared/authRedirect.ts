const REDIRECT_KEY = "zuvio:redirect_after_auth";

/** Caminhos que nunca fazem sentido guardar como "destino pendente" —
 * ou porque já são o destino padrão, ou porque são telas do próprio
 * fluxo de autenticação. */
const IGNORED_PATHS = ["/", "/entrar", "/completar-perfil"];

/**
 * Guarda o caminho atual (rota + querystring) para a pessoa ser levada
 * de volta pra lá depois de logar/cadastrar. Usado quando alguém sem
 * conta abre um link direto pra um evento (compartilhado por outra
 * pessoa) — sem isso, ela cai na tela inicial depois de se cadastrar,
 * perdendo o evento que estava tentando ver.
 */
export function saveIntendedPath(pathname: string, search: string): void {
  if (
    IGNORED_PATHS.includes(pathname) ||
    pathname.startsWith("/convite/") ||
    pathname.startsWith("/grupos/convite/")
  ) {
    return;
  }
  sessionStorage.setItem(REDIRECT_KEY, pathname + search);
}

/** Lê e apaga o destino pendente de uma vez — nunca deve ser consumido duas vezes. */
export function consumeIntendedPath(): string | null {
  const path = sessionStorage.getItem(REDIRECT_KEY);
  if (path) sessionStorage.removeItem(REDIRECT_KEY);
  return path;
}

/** Só olha, sem apagar — usado pra decidir se um redirect é necessário antes de consumir de vez. */
export function peekIntendedPath(): string | null {
  return sessionStorage.getItem(REDIRECT_KEY);
}
