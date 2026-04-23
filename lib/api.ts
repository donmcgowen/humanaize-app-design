/**
 * Shared API helpers — thin wrappers around the humanaize.life REST/tRPC API.
 * All procedure names match the live web app backend (HumanAIze-app/server/routers.ts).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://humanaize.life/api/trpc";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    // "humanaize_token" is the key used by lib/auth.ts login()
    const token = await AsyncStorage.getItem("humanaize_token");
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
}

async function trpcQuery(procedure: string, input?: object) {
  const params = input
    ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : "";
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API}/${procedure}${params}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders },
  });
  const data = await res.json();
  if (data?.error) {
    const msg =
      data.error?.json?.message ||
      data.error?.message ||
      "API error";
    throw new Error(msg);
  }
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
  if (data?.error) {
    const msg =
      data.error?.json?.message ||
      data.error?.message ||
      "API error";
    throw new Error(msg);
  }
  return data?.result?.data?.json ?? data?.result?.data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function apiLogin(username: string, password: string) {
  return trpcMutation("auth.login", { username, password });
}

export async function apiSignup(params: {
  username: string;
  email: string;
  password: string;
  name?: string;
}) {
  return trpcMutation("auth.signup", params);
}

export async function apiLogout() {
  return trpcMutation("auth.logout", {});
}

export async function apiGetMe() {
  return trpcQuery("auth.me");
}

// ── Profile (profile.* router — matches web app) ──────────────────────────────
/**
 * Get the user's fitness profile.
 * Web: trpc.profile.get
 */
export async function apiGetProfile() {
  return trpcQuery("profile.get");
}

/**
 * Save / update the user's fitness profile.
 * Web: trpc.profile.upsert
 * Field names match the backend schema exactly.
 */
export async function apiUpdateProfile(data: {
  heightIn?: number;
  weightLbs?: number;
  ageYears?: number;
  fitnessGoal?: "lose_fat" | "build_muscle" | "maintain";
  activityLevel?:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extremely_active";
  diabetesType?: "type1" | "type2" | "prediabetes" | "gestational" | "other";
  goalWeightLbs?: number;
  goalDate?: number; // Unix ms timestamp
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbsTarget?: number;
  dailyFatTarget?: number;
  gender?: "male" | "female" | "other";
  healthConditions?: string;
  onboardingCompleted?: boolean;
}) {
  return trpcMutation("profile.upsert", data);
}

/**
 * Generate an AI fitness plan.
 * Web: trpc.profile.generateAIPlan
 */
export async function apiGetAIPlan(data: object) {
  return trpcMutation("profile.generateAIPlan", data);
}

// ── Food Log (food.* router) ──────────────────────────────────────────────────
/**
 * Get food log entries for a given date.
 * Web: trpc.food.getFoodLog  (input: { date: "yyyy-MM-dd" })
 */
export async function apiGetFoodLog(date: string) {
  return trpcQuery("food.getFoodLog", { date });
}

/**
 * Add a food entry to the log.
 * Web: trpc.food.addFoodEntry
 */
export async function apiAddFoodEntry(entry: {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal?: string; // "Breakfast" | "Lunch" | "Dinner" | "Snacks"
  amount?: number;
  unit?: string;
  date?: string; // "yyyy-MM-dd"
}) {
  return trpcMutation("food.addFoodEntry", entry);
}

/**
 * Delete a food log entry.
 * Web: trpc.food.deleteFoodEntry  (input: { id })
 */
export async function apiDeleteFoodEntry(id: number) {
  return trpcMutation("food.deleteFoodEntry", { id });
}

/**
 * Search for food using AI / Open Food Facts.
 * Web: trpc.food.searchWithAI  (publicProcedure — no auth needed)
 */
export async function apiSearchFood(query: string) {
  return trpcQuery("food.searchWithAI", { query });
}

/**
 * Get recently logged foods.
 * Web: trpc.food.getRecent
 */
export async function apiGetRecentFoods() {
  return trpcQuery("food.getRecent");
}

// ── Workouts (workouts.* router) ──────────────────────────────────────────────
/**
 * Get workout entries for a date range.
 * Web: trpc.workouts.getEntriesForDate  (input: { dayStart, dayEnd } Unix ms)
 */
export async function apiGetWorkouts(dayStart: number, dayEnd: number) {
  return trpcQuery("workouts.getEntriesForDate", { dayStart, dayEnd });
}

/**
 * Log a workout entry.
 * Web: trpc.workouts.addEntry
 */
export async function apiLogWorkout(data: {
  exerciseName: string;
  exerciseType: string;
  durationMinutes: number;
  caloriesBurned?: number;
  intensity?: "light" | "moderate" | "intense";
  notes?: string;
  recordedAt?: number;
}) {
  return trpcMutation("workouts.addEntry", data);
}

/**
 * Get AI workout plan recommendations.
 * Web: trpc.workouts.getAIWorkoutPlan
 */
export async function apiGetAIWorkoutPlan() {
  return trpcQuery("workouts.getAIWorkoutPlan");
}

// ── Weight Tracking (weight.* router) ────────────────────────────────────────
/**
 * Get weight history entries.
 * Web: trpc.weight.getEntries  (input: { days: number })
 */
export async function apiGetWeightHistory(days = 90) {
  return trpcQuery("weight.getEntries", { days });
}

/**
 * Log a weight entry.
 * Web: trpc.weight.addEntry  (input: { weightLbs, recordedAt, notes? })
 */
export async function apiLogWeight(weightLbs: number, recordedAt: number, notes?: string) {
  return trpcMutation("weight.addEntry", { weightLbs, recordedAt, notes });
}

/**
 * Get weekly weight loss rate and progress data.
 * Web: trpc.weight.getWeeklyRate
 */
export async function apiGetWeightWeeklyRate() {
  return trpcQuery("weight.getWeeklyRate");
}

// ── Body Measurements (bodyMeasurements.* router) ────────────────────────────
/**
 * Get body measurement entries.
 * Web: trpc.bodyMeasurements.getEntries  (input: { limit })
 */
export async function apiGetMeasurements(limit = 100) {
  return trpcQuery("bodyMeasurements.getEntries", { limit });
}

/**
 * Log a body measurement.
 * Web: trpc.bodyMeasurements.addEntry
 */
export async function apiLogMeasurement(data: {
  chestInches?: number;
  waistInches?: number;
  hipsInches?: number;
  notes?: string;
}) {
  return trpcMutation("bodyMeasurements.addEntry", data);
}

// ── Food Scanning ─────────────────────────────────────────────────────────────
/**
 * Look up a product by barcode.
 * Routes through the backend (food.lookupBarcode) which uses Open Food Facts
 * server-side — avoids mobile rate-limiting issues with direct OFf calls.
 * Web: trpc.food.lookupBarcode  (input: { barcode: /^\d{8,14}$/ })
 */
export async function apiScanBarcode(barcode: string) {
  // Use the backend endpoint — it calls Open Food Facts server-side
  // and returns accurate per-serving macros with defaultUnit.
  try {
    const result = await trpcQuery("food.lookupBarcode", { barcode });
    return result;
  } catch {
    return null;
  }
}

/**
 * Analyze a meal or product photo with AI.
 * Web: trpc.food.analyzeMealPhoto
 */
export async function apiAIScanFood(
  imageBase64: string,
  scanMode: "product" | "meal" = "product"
) {
  return trpcMutation("food.analyzeMealPhoto", {
    imageBase64,
    mimeType: "image/jpeg",
    scanMode,
  });
}

/**
 * Calculate macros for a given serving size.
 * Web: trpc.food.calculateServingMacros
 */
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
  return trpcQuery("food.calculateServingMacros", data);
}

// ── AI Assistant (profile.* router) ──────────────────────────────────────────
/**
 * Ask the AI assistant a question.
 * Web: trpc.profile.askAssistant
 */
export async function apiAskAssistant(
  message: string,
  context?: string,
  profileSummary?: string
) {
  return trpcMutation("profile.askAssistant", {
    message,
    context,
    profileSummary,
  });
}

// ── Workout AI Features ───────────────────────────────────────────────────────
/**
 * Parse a text description of a workout into structured exercises.
 * Web: trpc.workouts.parseFromText
 */
export async function apiParseWorkoutFromText(text: string) {
  return trpcMutation("workouts.parseFromText", { text });
}

/**
 * Parse a voice recording (base64 audio) of a workout into structured exercises.
 * Web: trpc.workouts.parseFromVoice
 */
export async function apiParseWorkoutFromVoice(audioBase64: string, mimeType = "audio/m4a") {
  return trpcMutation("workouts.parseFromVoice", { audioBase64, mimeType });
}

/**
 * Get a personalized AI workout plan.
 * Web: trpc.workouts.getAIWorkoutPlan
 */
export async function apiGetAIWorkoutPlanFull(opts: {
  workoutType?: "strength" | "cardio" | "hiit" | "flexibility" | "full_body" | "upper_body" | "lower_body" | "core";
  durationMins?: number;
  intensity?: "light" | "moderate" | "intense";
  customRequest?: string;
}) {
  return trpcMutation("workouts.getAIWorkoutPlan", opts);
}

// ── Progress Photos ───────────────────────────────────────────────────────────
/**
 * Get all progress photos for the current user.
 * Web: trpc.progressPhotos.getPhotos
 */
export async function apiGetProgressPhotos() {
  return trpcQuery("progressPhotos.getPhotos");
}

/**
 * Upload a progress photo (base64 encoded).
 * Web: trpc.progressPhotos.uploadPhoto
 */
export async function apiUploadProgressPhoto(data: {
  photoBase64: string;
  photoName: string;
  photoDate: number;
  description?: string;
}) {
  return trpcMutation("progressPhotos.uploadPhoto", data);
}

/**
 * Delete a progress photo.
 * Web: trpc.progressPhotos.deletePhoto
 */
export async function apiDeleteProgressPhoto(photoId: number) {
  return trpcMutation("progressPhotos.deletePhoto", { photoId });
}

/**
 * Analyze a body photo with Gemini AI for body composition insights.
 * Web: trpc.progressPhotos.analyzeBodyPhoto
 */
export async function apiAnalyzeBodyPhoto(photoBase64: string, mimeType = "image/jpeg") {
  return trpcMutation("progressPhotos.analyzeBodyPhoto", { photoBase64, mimeType });
}
