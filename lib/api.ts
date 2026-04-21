/**
 * Shared API helpers — thin wrappers around the humanaize.life REST/tRPC API.
 * We use direct fetch (not tRPC client) for simplicity in React Native,
 * since the tRPC client requires a full router type import which pulls in Node.js deps.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://humanaize.life/api/trpc";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    // "humanaize_token" is the key used by lib/auth.ts login()
    const token = await AsyncStorage.getItem("humanaize_token");
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

/**
 * Fetch product data directly from Open Food Facts (free, no API key).
 * Returns null if not found.
 */
async function fetchOpenFoodFacts(barcode: string): Promise<any | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { "User-Agent": "HumanAIze/1.0" } }
    );
    const json = await res.json();
    if (json?.status !== 1 || !json?.product) return null;
    const p = json.product;
    const n = p.nutriments ?? {};
    // Prefer per-serving values; fall back to per-100g scaled by serving weight
    const servingWeightG = parseFloat(p.serving_quantity ?? p.serving_size_g ?? "0") || 0;
    const cal   = Number(n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? 0);
    const pro   = Number(n["proteins_serving"]    ?? n["proteins_100g"]    ?? 0);
    const carbs = Number(n["carbohydrates_serving"] ?? n["carbohydrates_100g"] ?? 0);
    const fat   = Number(n["fat_serving"]          ?? n["fat_100g"]          ?? 0);
    const cal100  = Number(n["energy-kcal_100g"]     ?? 0);
    const pro100  = Number(n["proteins_100g"]         ?? 0);
    const carb100 = Number(n["carbohydrates_100g"]    ?? 0);
    const fat100  = Number(n["fat_100g"]              ?? 0);
    if (cal === 0 && pro === 0) return null; // no useful data
    return {
      name:    p.product_name || p.product_name_en || "Unknown Product",
      brand:   p.brands || undefined,
      calories: Math.round(cal),
      protein:  parseFloat(pro.toFixed(1)),
      carbs:    parseFloat(carbs.toFixed(1)),
      fat:      parseFloat(fat.toFixed(1)),
      caloriesPer100g:  cal100,
      proteinPer100g:   pro100,
      carbsPer100g:     carb100,
      fatPer100g:       fat100,
      servingSize:      p.serving_size || undefined,
      servingWeightPerUnit: servingWeightG > 0 ? servingWeightG : undefined,
      source: "openfoodfacts",
    };
  } catch {
    return null;
  }
}

export async function apiScanBarcode(barcode: string) {
  // Try the backend first
  let result: any = null;
  try {
    result = await trpcQuery("food.lookupBarcode", { barcode });
  } catch {
    result = null;
  }

  // If backend returns bad/missing macros (calories ≤ 10 or all zeros),
  // fall back to Open Food Facts which has accurate per-serving data.
  const backendCalories = Number(result?.calories ?? 0);
  const backendProtein  = Number(result?.protein  ?? 0);
  const hasBadMacros    = !result?.name || (backendCalories <= 10 && backendProtein <= 1);

  if (hasBadMacros) {
    const off = await fetchOpenFoodFacts(barcode);
    if (off) return off;
  }

  return result;
}

export async function apiAIScanFood(imageBase64: string, scanMode: "product" | "meal" = "product") {
  return trpcMutation("food.analyzeMealPhoto", { imageBase64, mimeType: "image/jpeg", scanMode });
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
  // calculateServingMacros is a tRPC query (GET), not a mutation
  return trpcQuery("food.calculateServingMacros", data);
}

// ── AI ────────────────────────────────────────────────────────────────────────
export async function apiAskAssistant(message: string, context?: string) {
  return trpcMutation("ai.askAssistant", { message, context });
}

export async function apiGetAIPlan() {
  return trpcQuery("ai.getAIPlan");
}
