import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type SignupParams } from "@/services/api/auth-api";
import type { User } from "@/data/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string) => Promise<User>;
  signup: (params: SignupParams) => Promise<User>;
  logout: () => void;
  setAuthSession: (user: User, token: string) => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuthSession = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    if (typeof window !== "undefined") {
      localStorage.setItem("sikhsetu_auth_token", newToken);
      localStorage.setItem("sikhsetu_user", JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sikhsetu_auth_token");
      localStorage.removeItem("sikhsetu_user");
      sessionStorage.clear();
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const res = await authApi.getMe();
      if (res.user) {
        setUser(res.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("sikhsetu_user", JSON.stringify(res.user));
        }
        return res.user;
      }
      return null;
    } catch (err) {
      console.warn("[Auth] Failed refreshing session:", err);
      logout();
      return null;
    }
  };

  const login = async (email: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email);
      setAuthSession(res.user, res.token);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (params: SignupParams): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authApi.signup(params);
      setAuthSession(res.user, res.token);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === "undefined") return;
      const savedToken = localStorage.getItem("sikhsetu_auth_token");

      if (savedToken) {
        setToken(savedToken);
        try {
          const res = await authApi.getMe();
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem("sikhsetu_user", JSON.stringify(res.user));
          } else {
            logout();
          }
        } catch {
          logout();
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        setAuthSession,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
