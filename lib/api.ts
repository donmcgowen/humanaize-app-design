/**
 * Shared API helpers — thin wrappers around the humanaize.life REST/tRPC API.
 * We use direct fetch (not tRPC client) for simplicity in React Native,
 * since the tRPC client requires a full router type import which pulls in Node.js deps.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://humanaize.life/api/trpc";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await AsyncStorage.getItem("session_token");
    if (token) return { "Authorization": `Bearer ${token}` };
  } catch {}
  return {};
}

async function trpcQuery(procedure: string, input?: object) {
  const params = input ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : "";
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API}/${procedure}${params}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || "API error");
  return data?.result?.data?.json ?? data?.result?.data;
}

async function trpcMutation(procedure: string, input: object) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API}/${procedure}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ json: input }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || "API error");
  return data?.result?.data?.json ?? data?.result?.data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function apiLogin(username: string, password: string) {
  return trpcMutation("auth.login", { username, password });
}

export async function apiSignup(params: { username: string; email: string; password: string; name?: string }) {
  return trpcMutation("auth.signup", params);
}

export async function apiLogout() {
  return trpcMutation("auth.logout", {});
}

export async function apiGetMe() {
  return trpcQuery("auth.me");
}

// ── User Profile ──────────────────────────────────────────────────────────────
export async function apiGetProfile() {
  return trpcQuery("user.getProfile");
}

export async function apiUpdateProfile(data: object) {
  return trpcMutation("user.updateProfile", data);
}

// ── Food Log ──────────────────────────────────────────────────────────────────
export async function apiGetFoodLog(date: string) {
  return trpcQuery("food.getFoodLog", { date });
}

export async function apiAddFoodEntry(entry: object) {
  return trpcMutation("food.addFoodEntry", entry);
}

export async function apiDeleteFoodEntry(id: number) {
  return trpcMutation("food.deleteFoodEntry", { id });
}

export async function apiSearchFood(query: string) {
  return trpcQuery("food.searchWithAI", { query });
}

// ── Workouts ──────────────────────────────────────────────────────────────────
export async function apiGetWorkouts(date?: string) {
  return trpcQuery("workout.getWorkouts", date ? { date } : undefined);
}

export async function apiLogWorkout(data: object) {
  return trpcMutation("workout.logWorkout", data);
}

// ── Monitoring / Weight ───────────────────────────────────────────────────────
export async function apiGetWeightHistory() {
  return trpcQuery("monitoring.getWeightHistory");
}

export async function apiLogWeight(weight: number, date: string, unit?: string) {
  return trpcMutation("monitoring.logWeight", { weight, date, unit: unit ?? "lbs" });
}

export async function apiGetMeasurements() {
  return trpcQuery("monitoring.getMeasurements");
}

export async function apiLogMeasurement(data: object) {
  return trpcMutation("monitoring.logMeasurement", data);
}

// ── Food Scanning ───────────────────────────────────────────────────────────
export async function apiScanBarcode(barcode: string) {
  return trpcQuery("food.lookupBarcode", { barcode });
}

export async function apiAIScanFood(imageBase64: string) {
  return trpcMutation("food.aiScanFood", { imageBase64 });
}

export async function apiCalculateMacros(data: {
  foodName: string;
  amount: number;
  unit: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingWeightG?: number;
}) {
  return trpcMutation("food.calculateServingMacros", data);
}

// ── AI ────────────────────────────────────────────────────────────────────────
export async function apiAskAssistant(message: string, context?: string) {
  return trpcMutation("ai.askAssistant", { message, context });
}

export async function apiGetAIPlan() {
  return trpcQuery("ai.getAIPlan");
}
