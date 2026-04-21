import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGetMe } from "./api";

export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => {},
});

// lib/auth.ts login() stores user under "humanaize_session"
// We also keep "humanaize_user" for backward compatibility
const SESSION_KEY_AUTH = "humanaize_session";
const SESSION_KEY_CTX  = "humanaize_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function setUser(u: User | null) {
    setUserState(u);
    if (u) {
      AsyncStorage.setItem(SESSION_KEY_CTX, JSON.stringify(u));
    } else {
      AsyncStorage.removeItem(SESSION_KEY_CTX);
      AsyncStorage.removeItem(SESSION_KEY_AUTH);
    }
  }

  async function refreshUser() {
    try {
      const me = await apiGetMe();
      if (me?.id) setUser(me);
    } catch {
      // Not logged in or network error — keep existing cached user
    }
  }

  useEffect(() => {
    async function init() {
      try {
        // Try both cache keys — prefer the one written by lib/auth.ts login()
        const cached =
          (await AsyncStorage.getItem(SESSION_KEY_AUTH)) ||
          (await AsyncStorage.getItem(SESSION_KEY_CTX));
        if (cached) setUserState(JSON.parse(cached));
        // Verify with server (uses humanaize_token set by lib/auth.ts)
        await refreshUser();
      } catch {}
      setLoading(false);
    }
    init();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
