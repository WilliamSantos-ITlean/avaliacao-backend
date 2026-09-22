import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from './api';
import { rememberPerson } from './directory';
import { isRole } from './format';
import { TOKEN_KEY, USER_KEY } from './keys';
import type { Role, SessionUser } from './types';

type AuthValue = {
  user: SessionUser | null;
  ready: boolean;
  fromJwt: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function readStoredUser(): SessionUser | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    const user = JSON.parse(raw) as SessionUser;
    if (!user.id || !user.email || !isRole(user.role)) return null;
    return user;
  } catch {
    return null;
  }
}

function decodeJwt(token: string): SessionUser | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const json = JSON.parse(atob(padded)) as { sub?: string; email?: string; role?: Role };
    if (!json.sub || !json.email || !isRole(json.role)) return null;
    return { id: json.sub, email: json.email, role: json.role };
  } catch {
    return null;
  }
}

function readToken(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const row = payload as { accessToken?: string; access_token?: string; token?: string };
  return row.accessToken || row.access_token || row.token || null;
}

async function loadProfile(): Promise<{ user: SessionUser; fromJwt: boolean }> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Sem token.');

  try {
    const me = await api<Partial<SessionUser>>('/auth/me');
    if (me?.id && me.email && isRole(me.role)) {
      const user = { id: me.id, email: me.email, role: me.role };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { user, fromJwt: false };
    }
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
  }

  const decoded = decodeJwt(token);
  if (!decoded) throw new Error('Não consegui ler o usuário no token.');
  localStorage.setItem(USER_KEY, JSON.stringify(decoded));
  return { user: decoded, fromJwt: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredUser);
  const [fromJwt, setFromJwt] = useState(false);
  const [ready, setReady] = useState(!localStorage.getItem(TOKEN_KEY));
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
    setFromJwt(false);
  }, []);

  const applyProfile = useCallback(async () => {
    const profile = await loadProfile();
    setUser(profile.user);
    setFromJwt(profile.fromJwt);
    setToken(localStorage.getItem(TOKEN_KEY));
    rememberPerson(profile.user);
  }, []);

  useEffect(() => {
    const onKick = () => logout();
    window.addEventListener('norte:unauthorized', onKick);
    return () => window.removeEventListener('norte:unauthorized', onKick);
  }, [logout]);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    let cancel = false;
    applyProfile()
      .catch(() => {
        if (!cancel) logout();
      })
      .finally(() => {
        if (!cancel) setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, [applyProfile, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api<unknown>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email: email.trim().toLowerCase(), password },
      });
      const accessToken = readToken(result);
      if (!accessToken) {
        throw new ApiError(200, 'O login não devolveu accessToken.', result);
      }
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      await applyProfile();
    },
    [applyProfile],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const created = await api<Partial<SessionUser>>('/auth/register', {
        method: 'POST',
        auth: false,
        body: { email: email.trim().toLowerCase(), password },
      });
      if (created?.id && created.email && isRole(created.role)) {
        rememberPerson({ id: created.id, email: created.email, role: created.role });
      }
      await login(email, password);
    },
    [login],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      fromJwt,
      token,
      login,
      register,
      logout,
      refresh: applyProfile,
    }),
    [user, ready, fromJwt, token, login, register, logout, applyProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth fora do AuthProvider');
  return value;
}
