import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "humanaize_session";
const TOKEN_KEY = "humanaize_token";
const API_URL = "https://humanaize.life/api";

export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
}

// Get the stored auth token for use in API requests
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Build headers with Authorization Bearer token for authenticated requests
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/trpc/auth.login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { username, password } }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Auth] Login HTTP error:", res.status, text);
      return { success: false, message: `Server error (${res.status})` };
    }

    const data = await res.json();
    const result = data?.result?.data?.json;

    if (result?.success) {
      const user = result.user;
      const token = result.token;
      // Store user info and session token in AsyncStorage
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      }
      return { success: true, user };
    }

    const errorMsg = data?.error?.data?.message || data?.error?.message || "Login failed";
    return { success: false, message: errorMsg };
  } catch (err: any) {
    console.error("[Auth] Login error:", err);
    return { success: false, message: "Network error — check your connection" };
  }
}

export async function signup(params: {
  username: string;
  email: string;
  password: string;
  name?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/trpc/auth.signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: params }),
    });

    if (!res.ok) {
      return { success: false, message: `Server error (${res.status})` };
    }

    const data = await res.json();
    const result = data?.result?.data?.json;

    if (result?.success) {
      return { success: true };
    }

    const errorMsg = data?.error?.data?.message || data?.error?.message || "Signup failed";
    return { success: false, message: errorMsg };
  } catch (err) {
    return { success: false, message: "Network error — check your connection" };
  }
}

export async function logout(): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_URL}/trpc/auth.logout`, {
      method: "POST",
      headers,
      body: JSON.stringify({ json: {} }),
    });
  } catch {}
  await AsyncStorage.removeItem(SESSION_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
