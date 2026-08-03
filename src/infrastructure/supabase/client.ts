import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha alto e cedo (H6) — melhor um erro claro no console do que um
  // app que "roda" mas falha silenciosamente em toda chamada ao banco.
  throw new Error(
    "[Supabase] VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes. " +
      "Copie .env.example para .env e preencha com as chaves do seu projeto Supabase."
  );
}

/**
 * Nota sobre tipagem: o cliente aqui NÃO usa o generic `<Database>` do
 * supabase-js — o formato exato que essa lib espera (Row/Insert/Update/
 * Relationships por tabela, mais o shape de Functions) é bem rígido e
 * só compila 100% certo quando gerado direto de um projeto Supabase
 * real (`supabase gen types typescript --project-id ...`), que ainda
 * não existe neste repositório. Em vez disso, a segurança de tipos
 * fica na fronteira que o app realmente usa: os tipos em
 * `database.types.ts` (linha de referência) e os mappers em
 * `mappers.ts`, que convertem cada resposta para os tipos de domínio
 * antes de chegar em qualquer hook/componente. Assim que o projeto
 * Supabase for criado, rode o comando acima e reative o generic aqui.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
