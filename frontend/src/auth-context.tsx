import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

type User = { id: string; email: string; name?: string } | null;

type AuthState = {
  user: User;
  loading: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) {
        const u = await api.me();
        setUser(u);
      }
    } catch {
      await setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await setToken(res.access_token);
    setUser(res.user);
    setIsGuest(false);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const res = await api.register(email, password, name);
    await setToken(res.access_token);
    setUser(res.user);
    setIsGuest(false);
  };

  const signOut = async () => {
    await setToken(null);
    setUser(null);
    setIsGuest(false);
  };

  const continueAsGuest = () => setIsGuest(true);

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, signIn, signUp, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
