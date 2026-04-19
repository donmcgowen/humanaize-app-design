/**
 * onboarding.tsx — HumanAIze Setup Wizard
 *
 * Steps:
 * 1. Goal        — Weight loss / Muscle gain / Maintain / Improve health
 * 2. Profile     — Name, age, sex, height, current weight
 * 3. Activity    — Sedentary / Light / Moderate / Very active / Athlete
 * 4. Health      — Health conditions (diabetes, hypertension, etc.)
 * 5. Targets     — Goal weight, target date, calorie/macro targets (auto-calculated)
 * 6. AI Plan     — Gemini generates personalised nutrition + workout plan
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiUpdateProfile } from "../lib/api";

const { width: W } = Dimensions.get("window");

const C = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  accent: "#06b6d4",
  green: "#10b981",
  purple: "#8b5cf6",
  orange: "#f97316",
  text: "#f1f5f9",
  muted: "#94a3b8",
  danger: "#ef4444",
};

const TOTAL_STEPS = 6;

// ── Data ───────────────────────────────────────────────────────────────────────

const GOALS = [
  { id: "lose_fat", label: "Lose Fat", icon: "flame-outline", color: C.orange, desc: "Reduce body fat while preserving muscle" },
  { id: "build_muscle", label: "Build Muscle", icon: "barbell-outline", color: "#3b82f6", desc: "Gain lean muscle mass and strength" },
  { id: "maintain", label: "Maintain", icon: "shield-checkmark-outline", color: C.green, desc: "Keep current weight and improve fitness" },
  { id: "improve_health", label: "Improve Health", icon: "heart-outline", color: "#ec4899", desc: "Better energy, sleep, and overall wellness" },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", icon: "desktop-outline", desc: "Little or no exercise, desk job", multiplier: 1.2 },
  { id: "light", label: "Lightly Active", icon: "walk-outline", desc: "Light exercise 1–3 days/week", multiplier: 1.375 },
  { id: "moderate", label: "Moderately Active", icon: "bicycle-outline", desc: "Moderate exercise 3–5 days/week", multiplier: 1.55 },
  { id: "very_active", label: "Very Active", icon: "fitness-outline", desc: "Hard exercise 6–7 days/week", multiplier: 1.725 },
  { id: "athlete", label: "Athlete", icon: "trophy-outline", desc: "Very hard exercise, physical job", multiplier: 1.9 },
];

const HEALTH_CONDITIONS = [
  { id: "type1_diabetes", label: "Type 1 Diabetes", icon: "medical-outline" },
  { id: "type2_diabetes", label: "Type 2 Diabetes", icon: "medical-outline" },
  { id: "hypertension", label: "High Blood Pressure", icon: "pulse-outline" },
  { id: "high_cholesterol", label: "High Cholesterol", icon: "water-outline" },
  { id: "celiac", label: "Celiac / Gluten-Free", icon: "leaf-outline" },
  { id: "lactose_intolerant", label: "Lactose Intolerant", icon: "nutrition-outline" },
  { id: "thyroid", label: "Thyroid Condition", icon: "body-outline" },
  { id: "pcos", label: "PCOS", icon: "female-outline" },
  { id: "heart_disease", label: "Heart Disease", icon: "heart-dislike-outline" },
  { id: "kidney_disease", label: "Kidney Disease", icon: "water-outline" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female"
): number {
  // Mifflin-St Jeor
  if (sex === "male") return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

function lbsToKg(lbs: number) { return lbs * 0.453592; }
function ftInToCm(ft: number, inches: number) { return (ft * 12 + inches) * 2.54; }

function calcTargets(data: WizardData): { calories: number; protein: number; carbs: number; fat: number } {
  const weightKg = lbsToKg(parseFloat(data.currentWeight) || 180);
  const heightCm = ftInToCm(parseFloat(data.heightFt) || 5, parseFloat(data.heightIn) || 8);
  const age = parseInt(data.age) || 30;
  const sex = data.sex as "male" | "female";
  const activityMultiplier =
    ACTIVITY_LEVELS.find((a) => a.id === data.activityLevel)?.multiplier ?? 1.55;

  const bmr = calcBMR(weightKg, heightCm, age, sex);
  let tdee = bmr * activityMultiplier;

  let calories = Math.round(tdee);
  if (data.goal === "lose_fat") calories = Math.round(tdee - 500);
  if (data.goal === "build_muscle") calories = Math.round(tdee + 300);

  // Protein: 1g per lb bodyweight for muscle, 0.8g for others
  const proteinMultiplier = data.goal === "build_muscle" ? 1.0 : 0.8;
  const protein = Math.round((parseFloat(data.currentWeight) || 180) * proteinMultiplier);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs: Math.max(carbs, 0), fat };
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface WizardData {
  goal: string;
  name: string;
  age: string;
  sex: string;
  heightFt: string;
  heightIn: string;
  currentWeight: string;
  activityLevel: string;
  healthConditions: string[];
  goalWeight: string;
  targetDate: string;
  dailyCalories: string;
  proteinTarget: string;
  carbTarget: string;
  fatTarget: string;
}

const defaultData: WizardData = {
  goal: "",
  name: "",
  age: "",
  sex: "male",
  heightFt: "",
  heightIn: "",
  currentWeight: "",
  activityLevel: "moderate",
  healthConditions: [],
  goalWeight: "",
  targetDate: "",
  dailyCalories: "",
  proteinTarget: "",
  carbTarget: "",
  fatTarget: "",
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const update = (key: keyof WizardData, value: any) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggleCondition = (id: string) => {
    setData((d) => ({
      ...d,
      healthConditions: d.healthConditions.includes(id)
        ? d.healthConditions.filter((c) => c !== id)
        : [...d.healthConditions, id],
    }));
  };

  const goNext = () => {
    // Validate current step
    if (step === 1 && !data.goal) {
      Alert.alert("Select a Goal", "Please choose your primary fitness goal.");
      return;
    }
    if (step === 2) {
      if (!data.name.trim()) { Alert.alert("Name Required", "Please enter your name."); return; }
      if (!data.age || parseInt(data.age) < 13) { Alert.alert("Age Required", "Please enter a valid age (13+)."); return; }
      if (!data.currentWeight) { Alert.alert("Weight Required", "Please enter your current weight."); return; }
      if (!data.heightFt) { Alert.alert("Height Required", "Please enter your height."); return; }
    }
    if (step === 5) {
      // Auto-calculate targets if not set
      const targets = calcTargets(data);
      setData((d) => ({
        ...d,
        dailyCalories: d.dailyCalories || String(targets.calories),
        proteinTarget: d.proteinTarget || String(targets.protein),
        carbTarget: d.carbTarget || String(targets.carbs),
        fatTarget: d.fatTarget || String(targets.fat),
      }));
    }
    if (step === TOTAL_STEPS) {
      handleFinish();
      return;
    }
    animateStep(step + 1);
  };

  const goBack = () => {
    if (step === 1) { router.back(); return; }
    animateStep(step - 1);
  };

  const animateStep = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -W, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: W, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });
  };

  const generateAIPlan = async () => {
    setGeneratingPlan(true);
    try {
      const res = await fetch("https://humanaize.life/trpc/ai.generatePlan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {} }),
      });
      const json = await res.json();
      const plan = json?.result?.data?.json?.plan ?? json?.result?.data?.plan;
      setAiPlan(plan ?? "Your personalised plan has been created! Check the Dashboard for your daily targets and AI recommendations.");
    } catch {
      setAiPlan("Your profile has been saved. Gemini will generate personalised insights as you use the app.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiUpdateProfile({
        name: data.name,
        age: parseInt(data.age),
        sex: data.sex,
        heightFt: parseFloat(data.heightFt),
        heightIn: parseFloat(data.heightIn) || 0,
        currentWeight: parseFloat(data.currentWeight),
        goalWeight: parseFloat(data.goalWeight) || undefined,
        goal: data.goal,
        activityLevel: data.activityLevel,
        healthConditions: data.healthConditions,
        targetDate: data.targetDate || undefined,
        dailyCalorieTarget: parseInt(data.dailyCalories) || undefined,
        proteinTarget: parseInt(data.proteinTarget) || undefined,
        carbTarget: parseInt(data.carbTarget) || undefined,
        fatTarget: parseInt(data.fatTarget) || undefined,
      });
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step Renderers ───────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your primary goal?</Text>
      <Text style={styles.stepSub}>This helps us personalise your nutrition and workout plan.</Text>
      <View style={styles.optionGrid}>
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.goalCard, data.goal === g.id && { borderColor: g.color, backgroundColor: g.color + "15" }]}
            onPress={() => update("goal", g.id)}
          >
            <View style={[styles.goalIcon, { backgroundColor: g.color + "20" }]}>
              <Ionicons name={g.icon as any} size={28} color={g.color} />
            </View>
            <Text style={[styles.goalLabel, data.goal === g.id && { color: g.color }]}>{g.label}</Text>
            <Text style={styles.goalDesc}>{g.desc}</Text>
            {data.goal === g.id && (
              <View style={[styles.checkBadge, { backgroundColor: g.color }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSub}>Used to calculate your personalised calorie and macro targets.</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={data.name}
          onChangeText={(v) => update("name", v)}
          placeholder="Your name"
          placeholderTextColor={C.muted}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Age</Text>
          <TextInput
            style={styles.input}
            value={data.age}
            onChangeText={(v) => update("age", v)}
            placeholder="30"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Sex</Text>
          <View style={styles.sexToggle}>
            {["male", "female"].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sexBtn, data.sex === s && styles.sexBtnActive]}
                onPress={() => update("sex", s)}
              >
                <Text style={[styles.sexBtnText, data.sex === s && styles.sexBtnTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Height</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={data.heightFt}
              onChangeText={(v) => update("heightFt", v)}
              placeholder="5 ft"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={data.heightIn}
              onChangeText={(v) => update("heightIn", v)}
              placeholder="8 in"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Current Weight (lbs)</Text>
        <TextInput
          style={styles.input}
          value={data.currentWeight}
          onChangeText={(v) => update("currentWeight", v)}
          placeholder="180"
          placeholderTextColor={C.muted}
          keyboardType="decimal-pad"
        />
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>How active are you?</Text>
      <Text style={styles.stepSub}>Be honest — this directly affects your calorie target.</Text>
      <View style={styles.optionList}>
        {ACTIVITY_LEVELS.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.activityCard, data.activityLevel === a.id && styles.activityCardActive]}
            onPress={() => update("activityLevel", a.id)}
          >
            <Ionicons
              name={a.icon as any}
              size={22}
              color={data.activityLevel === a.id ? C.accent : C.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.activityLabel, data.activityLevel === a.id && { color: C.accent }]}>
                {a.label}
              </Text>
              <Text style={styles.activityDesc}>{a.desc}</Text>
            </View>
            {data.activityLevel === a.id && (
              <Ionicons name="checkmark-circle" size={22} color={C.accent} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Any health conditions?</Text>
      <Text style={styles.stepSub}>
        Gemini AI uses this to tailor recommendations and flag foods to avoid.
      </Text>
      <View style={styles.conditionGrid}>
        {HEALTH_CONDITIONS.map((c) => {
          const active = data.healthConditions.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.conditionChip, active && styles.conditionChipActive]}
              onPress={() => toggleCondition(c.id)}
            >
              <Ionicons
                name={c.icon as any}
                size={16}
                color={active ? "#fff" : C.muted}
              />
              <Text style={[styles.conditionText, active && { color: "#fff" }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.conditionNote}>
        Select all that apply. This is stored privately and used only to personalise your AI recommendations.
      </Text>
    </ScrollView>
  );

  const renderStep5 = () => {
    const suggested = calcTargets(data);
    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Your Targets</Text>
        <Text style={styles.stepSub}>
          We've calculated targets based on your profile. Edit them if needed.
        </Text>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Goal Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              value={data.goalWeight}
              onChangeText={(v) => update("goalWeight", v)}
              placeholder="160"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Target Date</Text>
            <TextInput
              style={styles.input}
              value={data.targetDate}
              onChangeText={(v) => update("targetDate", v)}
              placeholder="2026-12-31"
              placeholderTextColor={C.muted}
            />
          </View>
        </View>

        <View style={styles.suggestedBox}>
          <Text style={styles.suggestedTitle}>Suggested Daily Targets</Text>
          <View style={styles.suggestedRow}>
            {[
              { label: "Calories", value: suggested.calories, color: C.orange },
              { label: "Protein", value: `${suggested.protein}g`, color: "#3b82f6" },
              { label: "Carbs", value: `${suggested.carbs}g`, color: C.green },
              { label: "Fat", value: `${suggested.fat}g`, color: C.orange },
            ].map((s) => (
              <View key={s.label} style={styles.suggestedItem}>
                <Text style={[styles.suggestedValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.suggestedLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Daily Calorie Target</Text>
        <TextInput
          style={styles.input}
          value={data.dailyCalories || String(suggested.calories)}
          onChangeText={(v) => update("dailyCalories", v)}
          keyboardType="number-pad"
          placeholderTextColor={C.muted}
        />

        <View style={styles.row}>
          {[
            { key: "proteinTarget", label: "Protein (g)", suggested: suggested.protein },
            { key: "carbTarget", label: "Carbs (g)", suggested: suggested.carbs },
            { key: "fatTarget", label: "Fat (g)", suggested: suggested.fat },
          ].map(({ key, label, suggested: s }) => (
            <View key={key} style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                value={(data as any)[key] || String(s)}
                onChangeText={(v) => update(key as keyof WizardData, v)}
                keyboardType="number-pad"
                placeholderTextColor={C.muted}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <View style={styles.aiPlanIcon}>
        <Ionicons name="sparkles" size={48} color={C.purple} />
      </View>
      <Text style={styles.stepTitle}>Your AI Health Plan</Text>
      <Text style={styles.stepSub}>
        Gemini will create a personalised food and workout plan based on your profile.
      </Text>

      <View style={styles.planFeatureList}>
        {[
          { icon: "nutrition-outline", label: "Personalised Nutrition Plan", color: C.green, desc: "Daily macros, meal timing, foods to eat & avoid" },
          { icon: "barbell-outline", label: "Custom Workout Program", color: "#3b82f6", desc: "Exercise type, frequency, and weekly schedule" },
          { icon: "shield-checkmark-outline", label: "Health-Aware Recommendations", color: C.purple, desc: `Tailored for your ${data.healthConditions.length > 0 ? "health conditions and " : ""}goals` },
        ].map((f) => (
          <View key={f.label} style={styles.planFeature}>
            <View style={[styles.planFeatureIcon, { backgroundColor: f.color + "20" }]}>
              <Ionicons name={f.icon as any} size={22} color={f.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planFeatureLabel}>{f.label}</Text>
              <Text style={styles.planFeatureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {aiPlan ? (
        <View style={styles.planResult}>
          <Ionicons name="checkmark-circle" size={24} color={C.green} />
          <Text style={styles.planResultText}>{aiPlan.slice(0, 200)}{aiPlan.length > 200 ? "..." : ""}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.generateBtn, generatingPlan && { opacity: 0.6 }]}
          onPress={generateAIPlan}
          disabled={generatingPlan}
        >
          {generatingPlan ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.generateBtnText}>Generating your plan...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>Generate AI Plan</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const steps = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];
  const stepTitles = ["Goal", "Profile", "Activity", "Health", "Targets", "AI Plan"];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <Ionicons name="flash" size={22} color={C.accent} />
            <Text style={styles.logoText}>HumanAIze Setup</Text>
          </View>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/dashboard")}>
            <Text style={styles.skipText}>Skip setup</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {stepTitles.map((title, i) => (
            <View key={title} style={styles.stepDot}>
              <View
                style={[
                  styles.dot,
                  i + 1 < step && styles.dotDone,
                  i + 1 === step && styles.dotActive,
                ]}
              >
                {i + 1 < step ? (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                ) : (
                  <Text style={[styles.dotNum, i + 1 === step && { color: C.accent }]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.dotLabel, i + 1 === step && { color: C.accent }]}>
                {title}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Step content */}
      <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
        {steps[step - 1]()}
      </Animated.View>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={C.muted} />
          <Text style={styles.backBtnText}>{step === 1 ? "Cancel" : "Back"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, saving && { opacity: 0.6 }]}
          onPress={goNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step === TOTAL_STEPS ? "Get Started" : "Continue"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { color: C.text, fontSize: 16, fontWeight: "700" },
  skipText: { color: C.muted, fontSize: 14 },
  progressBar: {
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  stepDots: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  stepDot: { alignItems: "center", gap: 4 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: C.green },
  dotActive: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.accent },
  dotNum: { color: C.muted, fontSize: 10, fontWeight: "700" },
  dotLabel: { color: C.muted, fontSize: 9, fontWeight: "600" },

  stepContent: { flex: 1, padding: 20 },
  stepTitle: { color: C.text, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  stepSub: { color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 20 },

  // Goal cards
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  goalCard: {
    width: (W - 52) / 2,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: C.border,
    gap: 8,
    position: "relative",
  },
  goalIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  goalLabel: { color: C.text, fontSize: 15, fontWeight: "700" },
  goalDesc: { color: C.muted, fontSize: 12, lineHeight: 16 },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Profile
  fieldGroup: { gap: 6, marginBottom: 14 },
  fieldLabel: { color: C.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    color: C.text,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 12 },
  sexToggle: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    height: 50,
  },
  sexBtn: { flex: 1, alignItems: "center", justifyContent: "center" },
  sexBtnActive: { backgroundColor: C.accent },
  sexBtnText: { color: C.muted, fontWeight: "600", fontSize: 14 },
  sexBtnTextActive: { color: "#fff" },

  // Activity
  optionList: { gap: 10 },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: C.border,
  },
  activityCardActive: { borderColor: C.accent, backgroundColor: C.accent + "10" },
  activityLabel: { color: C.text, fontSize: 15, fontWeight: "700" },
  activityDesc: { color: C.muted, fontSize: 12 },

  // Health conditions
  conditionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  conditionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  conditionChipActive: { backgroundColor: C.purple, borderColor: C.purple },
  conditionText: { color: C.muted, fontSize: 13, fontWeight: "600" },
  conditionNote: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 16 },

  // Targets
  suggestedBox: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  suggestedTitle: { color: C.text, fontSize: 13, fontWeight: "700", marginBottom: 12 },
  suggestedRow: { flexDirection: "row", justifyContent: "space-between" },
  suggestedItem: { alignItems: "center", gap: 4 },
  suggestedValue: { fontSize: 20, fontWeight: "800" },
  suggestedLabel: { color: C.muted, fontSize: 11 },

  // AI Plan
  aiPlanIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.purple + "20",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  planFeatureList: { gap: 12, marginBottom: 24 },
  planFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  planFeatureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planFeatureLabel: { color: C.text, fontSize: 14, fontWeight: "700" },
  planFeatureDesc: { color: C.muted, fontSize: 12 },
  generateBtn: {
    backgroundColor: C.purple,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  planResult: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: C.green + "15",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.green + "40",
    alignItems: "flex-start",
  },
  planResultText: { color: C.text, fontSize: 13, lineHeight: 20, flex: 1 },

  // Footer
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  backBtnText: { color: C.muted, fontWeight: "600", fontSize: 15 },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
