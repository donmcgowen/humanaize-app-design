import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "humanaize_session";
const API_URL = "https://humanaize.life";

export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
}

export async function login(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/trpc/auth.login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ json: { username, password } }),
    });
    const data = await res.json();
    if (data?.result?.data?.json?.success) {
      const user = data.result.data.json.user;
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: data?.error?.message || "Login failed" };
  } catch (err) {
    return { success: false, message: "Network error" };
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
      credentials: "include",
      body: JSON.stringify({ json: params }),
    });
    const data = await res.json();
    if (data?.result?.data?.json?.success) {
      return { success: true };
    }
    return { success: false, message: data?.error?.message || "Signup failed" };
  } catch (err) {
    return { success: false, message: "Network error" };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/trpc/auth.logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ json: {} }),
    });
  } catch {}
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
