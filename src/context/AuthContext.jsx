import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { pullRemoteIntoLocal, clearUserLocalData } from '../utils/sync';

const AuthContext = createContext({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children, onRemoteSynced }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const session = data?.session || null;
      setUser(session?.user || null);
      setLoading(false);
      if (session?.user) {
        await pullRemoteIntoLocal(session.user.id);
        onRemoteSynced?.();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (event === 'SIGNED_IN' && session?.user) {
        await pullRemoteIntoLocal(session.user.id);
        onRemoteSynced?.();
      }
      if (event === 'SIGNED_OUT') {
        clearUserLocalData();
        onRemoteSynced?.();
      }
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInWithGoogle() {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  }

  async function signInWithEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUpWithEmail(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
