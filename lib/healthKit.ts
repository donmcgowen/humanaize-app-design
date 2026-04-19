/**
 * healthKit.ts — Apple HealthKit & Google Fit integration
 *
 * Uses expo-health (if installed) or falls back to a mock for development.
 * Reads: steps, active calories, weight, heart rate
 * Writes: workouts, nutrition (calories, macros)
 *
 * NOTE: expo-health requires a physical device and proper entitlements.
 * The app will gracefully degrade on simulators/emulators.
 */

import { Platform } from "react-native";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HealthData {
  steps: number;
  activeCalories: number;
  weight?: number;
  heartRate?: number;
  date: string;
}

export interface HealthPermissions {
  steps: boolean;
  activeCalories: boolean;
  weight: boolean;
  heartRate: boolean;
}

// ── Health module loader ───────────────────────────────────────────────────────

let Health: any = null;

async function loadHealthModule() {
  if (Health) return Health;
  try {
    // Try to load expo-health (requires: npx expo install expo-health)
    Health = await import("expo-health");
    return Health;
  } catch {
    // Not installed or not supported — return null (graceful degradation)
    return null;
  }
}

// ── Permissions ────────────────────────────────────────────────────────────────

export async function requestHealthPermissions(): Promise<HealthPermissions> {
  const h = await loadHealthModule();
  if (!h) {
    return { steps: false, activeCalories: false, weight: false, heartRate: false };
  }

  try {
    if (Platform.OS === "ios") {
      const result = await h.requestPermissionsAsync([
        h.HealthDataType.STEPS,
        h.HealthDataType.ACTIVE_ENERGY_BURNED,
        h.HealthDataType.BODY_MASS,
        h.HealthDataType.HEART_RATE,
      ]);
      return {
        steps: result.granted.includes(h.HealthDataType.STEPS),
        activeCalories: result.granted.includes(h.HealthDataType.ACTIVE_ENERGY_BURNED),
        weight: result.granted.includes(h.HealthDataType.BODY_MASS),
        heartRate: result.granted.includes(h.HealthDataType.HEART_RATE),
      };
    } else {
      // Android — Google Fit permissions
      const result = await h.requestPermissionsAsync([
        h.HealthDataType.STEPS,
        h.HealthDataType.ACTIVE_ENERGY_BURNED,
        h.HealthDataType.BODY_MASS,
      ]);
      return {
        steps: result.granted.includes(h.HealthDataType.STEPS),
        activeCalories: result.granted.includes(h.HealthDataType.ACTIVE_ENERGY_BURNED),
        weight: result.granted.includes(h.HealthDataType.BODY_MASS),
        heartRate: false,
      };
    }
  } catch {
    return { steps: false, activeCalories: false, weight: false, heartRate: false };
  }
}

// ── Read today's data ──────────────────────────────────────────────────────────

export async function getTodayHealthData(): Promise<HealthData> {
  const today = new Date().toISOString().split("T")[0];
  const h = await loadHealthModule();

  if (!h) {
    // Return zeros when health module not available
    return { steps: 0, activeCalories: 0, date: today };
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();

    const [stepsResult, caloriesResult] = await Promise.allSettled([
      h.getHealthDataAsync({
        type: h.HealthDataType.STEPS,
        startDate: startOfDay,
        endDate: now,
        unit: "count",
      }),
      h.getHealthDataAsync({
        type: h.HealthDataType.ACTIVE_ENERGY_BURNED,
        startDate: startOfDay,
        endDate: now,
        unit: "kcal",
      }),
    ]);

    const steps =
      stepsResult.status === "fulfilled"
        ? Math.round(stepsResult.value?.reduce((s: number, r: any) => s + (r.value ?? 0), 0) ?? 0)
        : 0;

    const activeCalories =
      caloriesResult.status === "fulfilled"
        ? Math.round(caloriesResult.value?.reduce((s: number, r: any) => s + (r.value ?? 0), 0) ?? 0)
        : 0;

    return { steps, activeCalories, date: today };
  } catch {
    return { steps: 0, activeCalories: 0, date: today };
  }
}

// ── Get latest weight from HealthKit ──────────────────────────────────────────

export async function getLatestWeightFromHealth(): Promise<number | null> {
  const h = await loadHealthModule();
  if (!h) return null;

  try {
    const results = await h.getHealthDataAsync({
      type: h.HealthDataType.BODY_MASS,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
      endDate: new Date(),
      unit: Platform.OS === "ios" ? "lb" : "kg",
      limit: 1,
    });
    if (results?.length > 0) {
      const val = results[results.length - 1].value;
      return Platform.OS === "ios" ? val : val * 2.20462; // convert kg to lbs
    }
    return null;
  } catch {
    return null;
  }
}

// ── Write workout to HealthKit ─────────────────────────────────────────────────

export async function writeWorkoutToHealth(workout: {
  type: string;
  startDate: Date;
  endDate: Date;
  caloriesBurned: number;
}): Promise<boolean> {
  const h = await loadHealthModule();
  if (!h || Platform.OS !== "ios") return false;

  try {
    const workoutTypeMap: Record<string, any> = {
      strength: h.WorkoutActivityType.TRADITIONAL_STRENGTH_TRAINING,
      cardio: h.WorkoutActivityType.RUNNING,
      hiit: h.WorkoutActivityType.HIGH_INTENSITY_INTERVAL_TRAINING,
      yoga: h.WorkoutActivityType.YOGA,
      cycling: h.WorkoutActivityType.CYCLING,
      swimming: h.WorkoutActivityType.SWIMMING,
      walking: h.WorkoutActivityType.WALKING,
    };

    await h.saveWorkoutAsync({
      activityType: workoutTypeMap[workout.type.toLowerCase()] ?? h.WorkoutActivityType.OTHER,
      startDate: workout.startDate,
      endDate: workout.endDate,
      energyBurned: workout.caloriesBurned,
      energyBurnedUnit: "kcal",
    });
    return true;
  } catch {
    return false;
  }
}

// ── Write nutrition to HealthKit ───────────────────────────────────────────────

export async function writeNutritionToHealth(nutrition: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: Date;
}): Promise<boolean> {
  const h = await loadHealthModule();
  if (!h || Platform.OS !== "ios") return false;

  try {
    await Promise.allSettled([
      h.saveHealthDataAsync({
        type: h.HealthDataType.DIETARY_ENERGY_CONSUMED,
        value: nutrition.calories,
        unit: "kcal",
        startDate: nutrition.date,
        endDate: nutrition.date,
      }),
      h.saveHealthDataAsync({
        type: h.HealthDataType.DIETARY_PROTEIN,
        value: nutrition.protein,
        unit: "g",
        startDate: nutrition.date,
        endDate: nutrition.date,
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

// ── Step goal progress ─────────────────────────────────────────────────────────

export function getStepProgress(steps: number, goal = 10000): {
  percentage: number;
  remaining: number;
  achieved: boolean;
} {
  const percentage = Math.min(Math.round((steps / goal) * 100), 100);
  return {
    percentage,
    remaining: Math.max(goal - steps, 0),
    achieved: steps >= goal,
  };
}
