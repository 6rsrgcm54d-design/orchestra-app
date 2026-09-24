import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  isGsiLoaded,
  initTokenClient,
  requestAccessToken,
  getAccessToken,
  revokeToken,
  fetchUserInfo,
} from '../api/googleAuth';
import type { GoogleUser } from '../types';
import { safeStorage } from '../utils/storage';

interface AuthContextValue {
  user: GoogleUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signInGuest: () => void;
  signOut: () => void;
  refreshToken: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const GUEST_KEY = 'orchestra_guest_user';

const DEFAULT_GUEST_USER: GoogleUser = {
  name: 'Maestro: Luís Machado',
  email: 'luismachado78@gmail.com',
  picture: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(() => {
    const saved = safeStorage.getItem(GUEST_KEY);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.name === 'Direção Artística / Maestro' || u.email === 'orquestra@bomfim.pt') {
          u.name = 'Maestro: Luís Machado';
          u.email = 'luismachado78@gmail.com';
          safeStorage.setItem(GUEST_KEY, JSON.stringify(u));
        }
        return u;
      } catch {
        // fallback
      }
    }
    // Entra sempre diretamente para a app abrir de imediato
    safeStorage.setItem(GUEST_KEY, JSON.stringify(DEFAULT_GUEST_USER));
    return DEFAULT_GUEST_USER;
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return 'guest-token';
  });

  const [isLoading, setIsLoading] = useState(false);
  const gsiReady = useRef(false);

  useEffect(() => {
    if (isGsiLoaded()) {
      setupClient();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setupClient();
    document.head.appendChild(script);
  }, []);

  const setupClient = useCallback(() => {
    if (gsiReady.current || !CLIENT_ID) return;
    try {
      initTokenClient(
        CLIENT_ID,
        async (tokenResponse) => {
          const token = tokenResponse.access_token;
          setAccessToken(token);
          try {
            const userInfo = await fetchUserInfo(token);
            setUser(userInfo);
            safeStorage.removeItem(GUEST_KEY);
            toast.success(`Bem-vindo, ${userInfo.name}!`);
          } catch {
            toast.error('Erro ao obter informações do utilizador');
          } finally {
            setIsLoading(false);
          }
        },
        () => {
          toast.error('Autenticação Google falhou');
          setIsLoading(false);
        }
      );
      gsiReady.current = true;
    } catch {
      // client setup fail
    }
  }, []);

  const signIn = useCallback(() => {
    if (!CLIENT_ID) {
      toast.error('VITE_GOOGLE_CLIENT_ID não configurado. Podes usar o Modo Autónomo sem configuração!');
      return;
    }
    setIsLoading(true);
    if (!gsiReady.current) {
      setupClient();
    }
    try {
      requestAccessToken();
    } catch {
      toast.error('Erro ao iniciar login Google.');
      setIsLoading(false);
    }
  }, [setupClient]);

  const signInGuest = useCallback(() => {
    const guestUser: GoogleUser = {
      name: 'Maestro: Luís Machado',
      email: 'luismachado78@gmail.com',
      picture: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
    };
    setUser(guestUser);
    setAccessToken('guest-token');
    safeStorage.setItem(GUEST_KEY, JSON.stringify(guestUser));
    toast.success('Bem-vindo, Maestro Luís Machado!');
  }, []);

  const signOut = useCallback(() => {
    if (accessToken && accessToken !== 'guest-token') {
      revokeToken();
    }
    setUser(null);
    setAccessToken(null);
    safeStorage.removeItem(GUEST_KEY);
    toast.success('Sessão terminada');
  }, [accessToken]);

  const refreshToken = useCallback(() => {
    if (accessToken === 'guest-token') return;
    if (!getAccessToken()) {
      requestAccessToken();
    }
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        signIn,
        signInGuest,
        signOut,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
