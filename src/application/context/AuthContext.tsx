import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../infrastructure/supabase/client";
import { ProfileRepository } from "../../infrastructure/supabase/repositories/ProfileRepository";
import { GoogleCalendarRepository } from "../../infrastructure/supabase/repositories/GoogleCalendarRepository";
import type { Profile } from "../../domain/entities/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface SignUpInput {
  email: string;
  password: string;
  nome: string;
  dataNascimentoISO: string;
  genero?: string;
  localizacaoBase: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const p = await ProfileRepository.getOwn();
    setProfile(p);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        loadProfile();

        // Logo após um login OAuth (Google), a sessão traz o token do
        // provedor por uma única vez — é a única chance de capturá-lo
        // e guardar com segurança (via Edge Function) para a
        // sincronização com o Google Calendar funcionar depois.
        // `app_metadata.provider` reflete o método ORIGINAL de cadastro
        // da conta (ex.: "email", se a pessoa se cadastrou por e-mail e
        // só depois vinculou o Google) — não é confiável para saber se
        // ESTA sessão veio de um login OAuth. `provider_token` já é
        // esse sinal por si só: só existe logo após um login OAuth,
        // não importa qual foi o provedor original da conta.
        if (event === "SIGNED_IN" && newSession.provider_token) {
          GoogleCalendarRepository.storeTokens(
            newSession.provider_token,
            newSession.provider_refresh_token ?? undefined,
            3500 // token do Google expira em ~3600s; margem de segurança
          ).catch((err) => {
            console.error("Não foi possível salvar o token do Google Calendar:", err);
          });
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async (input: SignUpInput) => {
    // A criação da linha em `profiles` acontece automaticamente via
    // trigger `on_auth_user_created` no banco (ver migração SQL),
    // lendo estes mesmos campos de `raw_user_meta_data` — evita a
    // corrida entre "criar usuário" e "criar perfil" que existiria se
    // fizéssemos os dois passos separados pelo cliente.
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          nome: input.nome,
          data_nascimento: input.dataNascimentoISO,
          genero: input.genero ?? null,
          localizacao_base: input.localizacaoBase,
        },
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Escopo extra para poder criar eventos na Agenda de quem
        // confirmar presença — sem isso, só teríamos login, sem
        // permissão de escrever na agenda da pessoa.
        scopes: "https://www.googleapis.com/auth/calendar.events",
        queryParams: {
          // access_type=offline + prompt=consent são o que garante que
          // o Google devolva um refresh_token (sem isso, só vem o
          // access_token, que expira em ~1h e não pode ser renovado).
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile();
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
