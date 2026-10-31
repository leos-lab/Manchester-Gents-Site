import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from '../lib/api';
import { clearSession, loadSession, saveSession, saveUser } from '../lib/session';
import { unregisterPush } from '../lib/push';
import { CHAT_URL } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, token: null, user: null, chatUrl: null });

  const signOut = useCallback(async () => {
    await unregisterPush();
    await clearSession();
    setAuthToken(null);
    setState({ loading: false, token: null, user: null, chatUrl: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => signOut());
    loadSession()
      .then((session) => {
        if (session?.token) setAuthToken(session.token);
        setState({
          loading: false,
          token: session?.token || null,
          user: session?.user || null,
          chatUrl: session?.chatUrl || CHAT_URL
        });
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, [signOut]);

  const signIn = useCallback(async (identifier, password) => {
    const result = await api.login(identifier.trim(), password);
    const chatUrl = result.chatUrl || CHAT_URL;
    await saveSession({ token: result.token, user: result.user, chatUrl });
    setAuthToken(result.token);
    setState({ loading: false, token: result.token, user: result.user, chatUrl });
  }, []);

  // Refresh the cached profile (name, avatar, events attended…).
  const refreshMe = useCallback(async () => {
    const { me } = await api.me();
    await saveUser(me);
    setState((s) => ({ ...s, user: me }));
    return me;
  }, []);

  const deleteAccount = useCallback(
    async (password) => {
      await api.deleteAccount(password);
      await signOut();
    },
    [signOut]
  );

  const value = useMemo(
    () => ({ ...state, signedIn: Boolean(state.token), signIn, signOut, refreshMe, deleteAccount }),
    [state, signIn, signOut, refreshMe, deleteAccount]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
