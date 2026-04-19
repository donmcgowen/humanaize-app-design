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

const SESSION_KEY = "humanaize_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function setUser(u: User | null) {
    setUserState(u);
    if (u) {
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
    } else {
      AsyncStorage.removeItem(SESSION_KEY);
    }
  }

  async function refreshUser() {
    try {
      const me = await apiGetMe();
      if (me?.id) setUser(me);
    } catch {
      // Not logged in
    }
  }

  useEffect(() => {
    async function init() {
      try {
        // Try cached user first for instant load
        const cached = await AsyncStorage.getItem(SESSION_KEY);
        if (cached) setUserState(JSON.parse(cached));
        // Then verify with server
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
