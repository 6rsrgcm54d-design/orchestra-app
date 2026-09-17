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

interface AuthContextValue {
  user: GoogleUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  refreshToken: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const gsiReady = useRef(false);

  // Injeta o script GSI dinamicamente
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
    script.onerror = () => toast.error('Falha ao carregar Google Identity Services');
    document.head.appendChild(script);
  }, []);

  const setupClient = useCallback(() => {
    if (gsiReady.current) return;
    if (!CLIENT_ID) {
      toast.error('VITE_GOOGLE_CLIENT_ID não configurado. Cria o ficheiro .env');
      return;
    }
    initTokenClient(
      CLIENT_ID,
      async (tokenResponse) => {
        const token = tokenResponse.access_token;
        setAccessToken(token);
        try {
          const userInfo = await fetchUserInfo(token);
          setUser(userInfo);
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
  }, []);

  const signIn = useCallback(() => {
    setIsLoading(true);
    if (!gsiReady.current) {
      setupClient();
    }
    try {
      requestAccessToken();
    } catch (e) {
      toast.error('Erro ao iniciar login. Verifica se a Client ID está correta.');
      setIsLoading(false);
    }
  }, [setupClient]);

  const signOut = useCallback(() => {
    revokeToken();
    setUser(null);
    setAccessToken(null);
    toast.success('Sessão terminada');
  }, []);

  const refreshToken = useCallback(() => {
    if (!getAccessToken()) {
      requestAccessToken();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        signIn,
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
