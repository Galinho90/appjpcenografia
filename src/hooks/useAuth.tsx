import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail } from "@/lib/phone";

export type AppRole = "admin" | "gerente" | "visualizador";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const roleRef = useRef<AppRole | null>(null);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const fetchRole = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setRole(null);
      return;
    }
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      setRole(null);
      return;
    }
    setRole((data?.role as AppRole) ?? null);
  }, []);

  useEffect(() => {
    // 1) Listener primeiro
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      const nextUserId = newSession?.user?.id ?? null;
      const previousUserId = userIdRef.current;

      if (!nextUserId) {
        const isRealSignOut = event === "SIGNED_OUT" || previousUserId === null;

        if (!isRealSignOut) {
          return;
        }

        setSession(null);
        setUser(null);
        setRole(null);
        userIdRef.current = null;
        initializedRef.current = true;
        setLoading(false);
        return;
      }

      const userChanged = previousUserId !== nextUserId;
      const shouldFetchRole = !initializedRef.current || userChanged || roleRef.current === null;

      setSession(newSession);
      setUser(newSession.user);
      userIdRef.current = nextUserId;

      if (shouldFetchRole) {
        setLoading(true);
        setTimeout(() => {
          fetchRole(nextUserId).finally(() => {
            initializedRef.current = true;
            setLoading(false);
          });
        }, 0);
      } else if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    // 2) Depois lê sessão atual
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      const existingUserId = existing?.user?.id ?? null;
      setSession(existing);
      setUser(existing?.user ?? null);
      userIdRef.current = existingUserId;

      if (existingUserId) {
        fetchRole(existingUserId).finally(() => {
          initializedRef.current = true;
          setLoading(false);
        });
      } else {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = useCallback(async (phone: string, password: string) => {
    const email = phoneToEmail(phone);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const uid = data.user?.id;
    if (uid) {
      const { data: colab } = await supabase
        .from("colaboradores")
        .select("ativo")
        .eq("user_id", uid)
        .maybeSingle();
      if (colab && colab.ativo === false) {
        await supabase.auth.signOut();
        return { error: "Usuário inativo. Contate o administrador." };
      }
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  }, []);

  const refreshRole = useCallback(async () => {
    await fetchRole(user?.id);
  }, [fetchRole, user?.id]);

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signIn, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
