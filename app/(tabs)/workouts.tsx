import { useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { format } from "date-fns";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Colors } from "../../constants/colors";
import {
  apiGetWorkouts, apiLogWorkout,
  apiParseWorkoutFromText, apiParseWorkoutFromVoice,
  apiGetAIWorkoutPlanFull,
} from "../../lib/api";

const WORKOUT_TYPES = [
  { id: "strength", label: "Strength", icon: "🏋️" },
  { id: "cardio", label: "Cardio", icon: "🏃" },
  { id: "hiit", label: "HIIT", icon: "⚡" },
  { id: "yoga", label: "Yoga", icon: "🧘" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "other", label: "Other", icon: "🎯" },
];

const AI_WORKOUT_TYPES = [
  { id: "full_body", label: "Full Body", icon: "💪" },
  { id: "upper_body", label: "Upper Body", icon: "🦾" },
  { id: "lower_body", label: "Lower Body", icon: "🦵" },
  { id: "strength", label: "Strength", icon: "🏋️" },
  { id: "cardio", label: "Cardio", icon: "🏃" },
  { id: "hiit", label: "HIIT", icon: "⚡" },
  { id: "core", label: "Core", icon: "🎯" },
  { id: "flexibility", label: "Flexibility", icon: "🧘" },
];

const COMMON_EXERCISES: Record<string, string[]> = {
  strength: ["Bench Press", "Squat", "Deadlift", "Shoulder Press", "Pull-Up", "Barbell Row", "Bicep Curl", "Tricep Dip", "Leg Press", "Lat Pulldown"],
  cardio: ["Running", "Cycling", "Elliptical", "Rowing", "Swimming", "Jump Rope", "Stair Climber", "Walking"],
  hiit: ["Burpees", "Box Jumps", "Mountain Climbers", "Kettlebell Swing", "Battle Ropes", "Sprint Intervals"],
  yoga: ["Sun Salutation", "Warrior Pose", "Downward Dog", "Tree Pose", "Child\'s Pose"],
  sports: ["Basketball", "Soccer", "Tennis", "Golf", "Baseball", "Volleyball"],
  other: ["Stretching", "Foam Rolling", "Mobility Work", "Core Work"],
};

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

interface WorkoutLog {
  id: number;
  type: string;
  name: string;
  date: string;
  duration: number;
  caloriesBurned?: number;
  exercises: Exercise[];
  notes?: string;
}

interface ParsedExercise {
  name: string;
  exerciseType: string;
  muscleGroup: string;
  sets: number | null;
  reps: number | null;
  weightLbs: number | null;
  durationMins: number;
  caloriesBurned: number;
  intensity: "light" | "moderate" | "intense";
  notes: string;
}

interface ParsedWorkout {
  summary: string;
  workoutLocation: string;
  totalDurationMins: number;
  totalCaloriesBurned: number;
  exercises: ParsedExercise[];
  transcript?: string;
}

interface AIExercise {
  name: string;
  sets?: number;
  reps?: string;
  weight?: string;
  durationSecs?: number;
  restSecs?: number;
  muscleGroup: string;
  instructions: string;
  modifications?: string;
}

interface AIWorkoutSection {
  name: string;
  durationMins: number;
  exercises: AIExercise[];
  notes?: string;
}

interface AIWorkoutPlan {
  title: string;
  overview: string;
  totalDurationMins: number;
  difficulty: string;
  focusArea: string;
  estimatedCalories: number;
  sections: AIWorkoutSection[];
  nutritionNote?: string;
  safetyNotes?: string[];
  progressionTips?: string[];
}

// ── AI Plan Section Card ──────────────────────────────────────────────────────
function AIPlanSection({ section }: { section: AIWorkoutSection }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.planSection}>
      <TouchableOpacity style={styles.planSectionHeader} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.planSectionName}>{section.name}</Text>
        <Text style={styles.planSectionMeta}>{section.durationMins} min  {expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.planSectionBody}>
          {section.notes ? <Text style={styles.planSectionNote}>{section.notes}</Text> : null}
          {section.exercises.map((ex, i) => (
            <View key={i} style={styles.planExercise}>
              <Text style={styles.planExName}>{ex.name}</Text>
              <Text style={styles.planExMeta}>
                {ex.sets && ex.reps ? `${ex.sets} sets × ${ex.reps} reps` : ""}
                {ex.weight ? ` · ${ex.weight}` : ""}
                {ex.durationSecs ? `${ex.durationSecs}s` : ""}
                {ex.restSecs ? ` · Rest ${ex.restSecs}s` : ""}
              </Text>
              {ex.muscleGroup ? <Text style={styles.planExMuscle}>{ex.muscleGroup}</Text> : null}
              <Text style={styles.planExInstructions}>{ex.instructions}</Text>
              {ex.modifications ? <Text style={styles.planExMod}>Mod: {ex.modifications}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Parsed Preview ────────────────────────────────────────────────────────────
function ParsedPreview({ parsed, onSave, saving: isSaving }: { parsed: ParsedWorkout; onSave: () => void; saving: boolean }) {
  return (
    <View style={styles.parsedPreview}>
      {parsed.transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>Heard:</Text>
          <Text style={styles.transcriptText}>"{parsed.transcript}"</Text>
        </View>
      ) : null}
      <View style={styles.parsedSummaryRow}>
        <View style={styles.parsedStat}>
          <Text style={styles.parsedStatVal}>{parsed.totalDurationMins}</Text>
          <Text style={styles.parsedStatLabel}>min</Text>
        </View>
        <View style={styles.parsedStat}>
          <Text style={styles.parsedStatVal}>{parsed.totalCaloriesBurned}</Text>
          <Text style={styles.parsedStatLabel}>kcal</Text>
        </View>
        <View style={styles.parsedStat}>
          <Text style={styles.parsedStatVal}>{parsed.exercises.length}</Text>
          <Text style={styles.parsedStatLabel}>exercises</Text>
        </View>
      </View>
      {parsed.summary ? <Text style={styles.parsedSummaryText}>{parsed.summary}</Text> : null}
      {parsed.exercises.map((ex, i) => (
        <View key={i} style={styles.parsedExercise}>
          <View style={styles.parsedExHeader}>
            <Text style={styles.parsedExName}>{ex.name}</Text>
            <Text style={styles.parsedExType}>{ex.exerciseType}</Text>
          </View>
          {ex.notes ? <Text style={styles.parsedExNotes}>{ex.notes}</Text> : null}
          <View style={styles.parsedExStats}>
            {ex.sets ? <Text style={styles.parsedExStat}>{ex.sets} sets</Text> : null}
            {ex.reps ? <Text style={styles.parsedExStat}>{ex.reps} reps</Text> : null}
            {ex.weightLbs ? <Text style={styles.parsedExStat}>{ex.weightLbs} lbs</Text> : null}
            <Text style={styles.parsedExStat}>{ex.durationMins} min</Text>
            <Text style={styles.parsedExStat}>{ex.caloriesBurned} kcal</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
        onPress={onSave}
        disabled={isSaving}
      >
        {isSaving ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.saveBtnText}>💾 Save to Log</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ── Workout Card ──────────────────────────────────────────────────────────────
function WorkoutCard({ workout }: { workout: WorkoutLog }) {
  const typeInfo = WORKOUT_TYPES.find((t) => t.id === workout.type) ?? WORKOUT_TYPES[5];
  return (
    <View style={styles.workoutCard}>
      <View style={styles.workoutCardHeader}>
        <Text style={styles.workoutIcon}>{typeInfo.icon}</Text>
        <View style={styles.workoutCardInfo}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.workoutMeta}>
            {format(new Date(workout.date), "EEE, MMM d")} · {workout.duration} min
            {workout.caloriesBurned ? ` · ${workout.caloriesBurned} kcal` : ""}
          </Text>
        </View>
      </View>
      {workout.exercises?.length > 0 && (
        <View style={styles.exerciseList}>
          {workout.exercises.slice(0, 3).map((ex, i) => (
            <Text key={i} style={styles.exerciseItem}>
              • {ex.name}
              {ex.sets && ex.reps ? ` — ${ex.sets}×${ex.reps}` : ""}
              {ex.weight ? ` @ ${ex.weight} lbs` : ""}
            </Text>
          ))}
          {workout.exercises.length > 3 && (
            <Text style={styles.moreExercises}>+{workout.exercises.length - 3} more</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WorkoutsScreen() {
  const [activeTab, setActiveTab] = useState<"log" | "ai_plan" | "text" | "voice">("log");
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual log
  const [workoutType, setWorkoutType] = useState("strength");
  const [workoutName, setWorkoutName] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [intensity, setIntensity] = useState<"light" | "moderate" | "intense">("moderate");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // AI Plan
  const [aiWorkoutType, setAiWorkoutType] = useState<"full_body" | "upper_body" | "lower_body" | "strength" | "cardio" | "hiit" | "core" | "flexibility">("full_body");
  const [aiDuration, setAiDuration] = useState("45");
  const [aiIntensity, setAiIntensity] = useState<"light" | "moderate" | "intense">("moderate");
  const [aiCustomRequest, setAiCustomRequest] = useState("");
  const [aiPlan, setAiPlan] = useState<AIWorkoutPlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Text
  const [textInput, setTextInput] = useState("");
  const [textParsed, setTextParsed] = useState<ParsedWorkout | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textSaving, setTextSaving] = useState(false);

  // Voice
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceParsed, setVoiceParsed] = useState<ParsedWorkout | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceSaving, setVoiceSaving] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const data = await apiGetWorkouts(dayStart, dayEnd);
      if (Array.isArray(data)) {
        setWorkouts(data.map((w: any) => ({
          id: w.id,
          type: (w.exerciseType || "other").toLowerCase(),
          name: w.exerciseName || "Workout",
          date: new Date(w.recordedAt || Date.now()).toISOString(),
          duration: w.durationMinutes || 0,
          caloriesBurned: w.caloriesBurned,
          exercises: w.exercises || [],
          notes: w.notes,
        })));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  }, [loadWorkouts]);

  useState(() => { loadWorkouts(); });

  // Manual
  function addExercise(name: string) { setExercises((p) => [...p, { name }]); setExerciseSearch(""); }
  function removeExercise(i: number) { setExercises((p) => p.filter((_, idx) => idx !== i)); }
  function updateExercise(i: number, field: keyof Exercise, value: string) {
    setExercises((p) => p.map((ex, idx) => idx === i ? { ...ex, [field]: value ? Number(value) : undefined } : ex));
  }

  async function saveManualWorkout() {
    if (!workoutName.trim()) { Alert.alert("Name required"); return; }
    if (!duration || isNaN(Number(duration))) { Alert.alert("Duration required"); return; }
    setSaving(true);
    try {
      const exNotes = exercises.map((ex) => {
        let n = ex.name;
        if (ex.sets && ex.reps) n += ` ${ex.sets}×${ex.reps}`;
        if (ex.weight) n += ` @ ${ex.weight}lbs`;
        return n;
      }).join(", ");
      await apiLogWorkout({
        exerciseName: workoutName.trim(),
        exerciseType: workoutType,
        durationMinutes: parseInt(duration),
        caloriesBurned: calories ? parseInt(calories) : undefined,
        intensity,
        notes: [notes, exNotes].filter(Boolean).join(" | "),
        recordedAt: Date.now(),
      });
      setShowManualModal(false);
      setWorkoutName(""); setDuration(""); setCalories(""); setNotes(""); setExercises([]);
      await loadWorkouts();
      Alert.alert("Saved!", "Workout logged.");
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  }

  // AI Plan
  async function generateAIPlan() {
    setAiLoading(true); setAiPlan(null);
    try {
      const plan = await apiGetAIWorkoutPlanFull({ workoutType: aiWorkoutType, durationMins: parseInt(aiDuration) || 45, intensity: aiIntensity, customRequest: aiCustomRequest.trim() || undefined });
      setAiPlan(plan as AIWorkoutPlan);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setAiLoading(false); }
  }

  async function logAIPlan() {
    if (!aiPlan) return;
    setSaving(true);
    try {
      await apiLogWorkout({ exerciseName: aiPlan.title, exerciseType: aiWorkoutType, durationMinutes: aiPlan.totalDurationMins, caloriesBurned: aiPlan.estimatedCalories, intensity: aiIntensity, notes: aiPlan.overview, recordedAt: Date.now() });
      await loadWorkouts(); setAiPlan(null);
      Alert.alert("Logged!", "AI workout saved.");
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  }

  // Text
  async function parseTextWorkout() {
    if (!textInput.trim()) { Alert.alert("Enter workout description first."); return; }
    setTextLoading(true); setTextParsed(null);
    try { setTextParsed(await apiParseWorkoutFromText(textInput.trim()) as ParsedWorkout); }
    catch (e: any) { Alert.alert("Parse Error", e.message); }
    finally { setTextLoading(false); }
  }

  async function saveTextWorkout() {
    if (!textParsed) return;
    setTextSaving(true);
    try {
      for (const ex of textParsed.exercises) {
        await apiLogWorkout({ exerciseName: ex.name, exerciseType: ex.exerciseType, durationMinutes: ex.durationMins, caloriesBurned: ex.caloriesBurned, intensity: ex.intensity, notes: ex.notes || undefined, recordedAt: Date.now() });
      }
      await loadWorkouts(); setTextInput(""); setTextParsed(null);
      Alert.alert("Saved!", `${textParsed.exercises.length} exercise(s) logged.`);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setTextSaving(false); }
  }

  // Voice
  async function startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission needed", "Allow microphone access."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec); setIsRecording(true); setRecordingDuration(0); setVoiceParsed(null);
      recordingTimer.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch (e: any) { Alert.alert("Recording Error", e.message); }
  }

  async function stopRecording() {
    if (!recording) return;
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    setIsRecording(false); setVoiceLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error("No recording URI");
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setVoiceParsed(await apiParseWorkoutFromVoice(base64, "audio/m4a") as ParsedWorkout);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setVoiceLoading(false); }
  }

  async function saveVoiceWorkout() {
    if (!voiceParsed) return;
    setVoiceSaving(true);
    try {
      for (const ex of voiceParsed.exercises) {
        await apiLogWorkout({ exerciseName: ex.name, exerciseType: ex.exerciseType, durationMinutes: ex.durationMins, caloriesBurned: ex.caloriesBurned, intensity: ex.intensity, notes: ex.notes || undefined, recordedAt: Date.now() });
      }
      await loadWorkouts(); setVoiceParsed(null);
      Alert.alert("Saved!", `${voiceParsed.exercises.length} exercise(s) logged from voice.`);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setVoiceSaving(false); }
  }

  function formatDuration(secs: number) {
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {([
          { id: "log", label: "Today", icon: "📋" },
          { id: "ai_plan", label: "AI Plan", icon: "🤖" },
          { id: "text", label: "Log Text", icon: "✏️" },
          { id: "voice", label: "Voice", icon: "🎙️" },
        ] as const).map((tab) => (
          <TouchableOpacity key={tab.id} style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]} onPress={() => setActiveTab(tab.id)}>
            <Text style={styles.tabBtnIcon}>{tab.icon}</Text>
            <Text style={[styles.tabBtnLabel, activeTab === tab.id && styles.tabBtnLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TODAY */}
      {activeTab === "log" && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
          <TouchableOpacity style={styles.logBtn} onPress={() => setShowManualModal(true)}>
            <Text style={styles.logBtnIcon}>+</Text>
            <Text style={styles.logBtnText}>Log Workout</Text>
          </TouchableOpacity>
          {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : workouts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyTitle}>No workouts today</Text>
              <Text style={styles.emptySub}>Use the AI Planner, type your workout, or record by voice.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Today\'s Workouts</Text>
              {workouts.map((w) => <WorkoutCard key={w.id} workout={w} />)}
            </>
          )}
        </ScrollView>
      )}

      {/* AI PLAN */}
      {activeTab === "ai_plan" && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>AI Workout Planner</Text>
          <Text style={styles.sectionSub}>Personalized to your profile, goals, and today\'s nutrition.</Text>
          <Text style={styles.fieldLabel}>Workout Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {AI_WORKOUT_TYPES.map((t) => (
              <TouchableOpacity key={t.id} style={[styles.chip, aiWorkoutType === t.id && styles.chipActive]} onPress={() => setAiWorkoutType(t.id as any)}>
                <Text style={styles.chipIcon}>{t.icon}</Text>
                <Text style={[styles.chipLabel, aiWorkoutType === t.id && styles.chipLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.fieldLabel}>Duration</Text>
          <View style={styles.row}>
            {["20", "30", "45", "60", "90"].map((d) => (
              <TouchableOpacity key={d} style={[styles.durationChip, aiDuration === d && styles.durationChipActive]} onPress={() => setAiDuration(d)}>
                <Text style={[styles.durationChipText, aiDuration === d && styles.durationChipTextActive]}>{d} min</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Intensity</Text>
          <View style={styles.row}>
            {(["light", "moderate", "intense"] as const).map((lvl) => (
              <TouchableOpacity key={lvl} style={[styles.intensityChip, aiIntensity === lvl && styles.intensityChipActive]} onPress={() => setAiIntensity(lvl)}>
                <Text style={[styles.intensityChipText, aiIntensity === lvl && styles.intensityChipTextActive]}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Custom Request (optional)</Text>
          <TextInput style={styles.textArea} value={aiCustomRequest} onChangeText={setAiCustomRequest} placeholder="e.g. Focus on chest and triceps, avoid squats..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={2} />
          <TouchableOpacity style={[styles.generateBtn, aiLoading && styles.generateBtnDisabled]} onPress={generateAIPlan} disabled={aiLoading}>
            {aiLoading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.generateBtnText}>🤖 Generate Plan</Text>}
          </TouchableOpacity>
          {aiPlan && (
            <View style={styles.aiPlanResult}>
              <View style={styles.aiPlanHeader}>
                <Text style={styles.aiPlanTitle}>{aiPlan.title}</Text>
                <View style={styles.aiPlanMeta}>
                  <Text style={styles.aiPlanMetaItem}>⏱ {aiPlan.totalDurationMins} min</Text>
                  <Text style={styles.aiPlanMetaItem}>🔥 ~{aiPlan.estimatedCalories} kcal</Text>
                  <Text style={styles.aiPlanMetaItem}>📊 {aiPlan.difficulty}</Text>
                </View>
                <Text style={styles.aiPlanOverview}>{aiPlan.overview}</Text>
              </View>
              {aiPlan.nutritionNote && (
                <View style={styles.nutritionNote}>
                  <Text style={styles.nutritionNoteIcon}>🥗</Text>
                  <Text style={styles.nutritionNoteText}>{aiPlan.nutritionNote}</Text>
                </View>
              )}
              {aiPlan.sections.map((section, i) => <AIPlanSection key={i} section={section} />)}
              {aiPlan.safetyNotes && aiPlan.safetyNotes.length > 0 && (
                <View style={styles.safetyNotes}>
                  <Text style={styles.safetyNotesTitle}>⚠️ Safety Notes</Text>
                  {aiPlan.safetyNotes.map((note, i) => <Text key={i} style={styles.safetyNote}>• {note}</Text>)}
                </View>
              )}
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={logAIPlan} disabled={saving}>
                {saving ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.saveBtnText}>💾 Log This Workout</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* TEXT */}
      {activeTab === "text" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Text style={styles.sectionTitle}>Log Workout from Text</Text>
            <Text style={styles.sectionSub}>Describe your workout naturally — AI parses it into structured exercises.</Text>
            <Text style={styles.exampleText}>"Gym session, worked chest and triceps. Bench press 3 sets of 10 at 200lbs. Cable flys 3x15. Tricep pushdowns 4x12 at 60lbs."</Text>
            <TextInput style={styles.textArea} value={textInput} onChangeText={setTextInput} placeholder="Describe your workout here..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={5} />
            <TouchableOpacity style={[styles.generateBtn, textLoading && styles.generateBtnDisabled]} onPress={parseTextWorkout} disabled={textLoading}>
              {textLoading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.generateBtnText}>✨ Parse Workout</Text>}
            </TouchableOpacity>
            {textParsed && <ParsedPreview parsed={textParsed} onSave={saveTextWorkout} saving={textSaving} />}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* VOICE */}
      {activeTab === "voice" && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Voice Workout Logger</Text>
          <Text style={styles.sectionSub}>Tap record and describe your workout out loud. AI transcribes and parses it.</Text>
          <Text style={styles.exampleText}>"I did bench press, three sets of ten at two hundred pounds, then tricep dips, three sets of ten bodyweight."</Text>
          <View style={styles.voiceCenter}>
            {isRecording ? (
              <>
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
                </View>
                <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                  <Text style={styles.stopBtnIcon}>⏹</Text>
                  <Text style={styles.stopBtnText}>Stop Recording</Text>
                </TouchableOpacity>
              </>
            ) : voiceLoading ? (
              <View style={styles.voiceLoadingWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.voiceLoadingText}>Analyzing your workout...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
                <Text style={styles.recordBtnIcon}>🎙️</Text>
                <Text style={styles.recordBtnText}>Tap to Record</Text>
              </TouchableOpacity>
            )}
          </View>
          {voiceParsed && <ParsedPreview parsed={voiceParsed} onSave={saveVoiceWorkout} saving={voiceSaving} />}
        </ScrollView>
      )}

      {/* MANUAL MODAL */}
      <Modal visible={showManualModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowManualModal(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Log Workout</Text>
            <TouchableOpacity onPress={saveManualWorkout} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.fieldLabel}>Workout Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeRow}>
                {WORKOUT_TYPES.map((t) => (
                  <TouchableOpacity key={t.id} style={[styles.typeChip, workoutType === t.id && styles.typeChipActive]} onPress={() => setWorkoutType(t.id)}>
                    <Text style={styles.typeIcon}>{t.icon}</Text>
                    <Text style={[styles.typeLabel, workoutType === t.id && styles.typeLabelActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.fieldLabel}>Workout Name *</Text>
            <TextInput style={styles.input} value={workoutName} onChangeText={setWorkoutName} placeholder="e.g. Chest Day, Morning Run..." placeholderTextColor={Colors.textMuted} />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Duration (min) *</Text>
                <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="45" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Calories (optional)</Text>
                <TextInput style={styles.input} value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="300" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Intensity</Text>
            <View style={styles.row}>
              {(["light", "moderate", "intense"] as const).map((lvl) => (
                <TouchableOpacity key={lvl} style={[styles.intensityChip, intensity === lvl && styles.intensityChipActive]} onPress={() => setIntensity(lvl)}>
                  <Text style={[styles.intensityChipText, intensity === lvl && styles.intensityChipTextActive]}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.exercisesHeader}>
              <Text style={styles.fieldLabel}>Exercises</Text>
              <TouchableOpacity style={styles.addExBtn} onPress={() => addExercise(exerciseSearch || "New Exercise")}>
                <Text style={styles.addExBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={[styles.input, { marginBottom: 8 }]} value={exerciseSearch} onChangeText={setExerciseSearch} placeholder="Search or type exercise name..." placeholderTextColor={Colors.textMuted} />
            {exerciseSearch.length > 0 && (
              <View style={styles.exercisePicker}>
                {(COMMON_EXERCISES[workoutType] || []).filter((e) => e.toLowerCase().includes(exerciseSearch.toLowerCase())).slice(0, 5).map((e) => (
                  <TouchableOpacity key={e} style={styles.exPickerRow} onPress={() => addExercise(e)}>
                    <Text style={styles.exPickerName}>{e}</Text>
                  </TouchableOpacity>
                ))}
                {!COMMON_EXERCISES[workoutType]?.some((e) => e.toLowerCase() === exerciseSearch.toLowerCase()) && (
                  <TouchableOpacity style={styles.exPickerRow} onPress={() => addExercise(exerciseSearch)}>
                    <Text style={[styles.exPickerName, { color: Colors.primary }]}>+ Add "{exerciseSearch}"</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseRow}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <TouchableOpacity onPress={() => removeExercise(i)}><Text style={styles.exRemove}>✕</Text></TouchableOpacity>
                </View>
                <View style={styles.exFields}>
                  <TextInput style={styles.exInput} placeholder="Sets" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={ex.sets?.toString() || ""} onChangeText={(v) => updateExercise(i, "sets", v)} />
                  <TextInput style={styles.exInput} placeholder="Reps" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={ex.reps?.toString() || ""} onChangeText={(v) => updateExercise(i, "reps", v)} />
                  <TextInput style={styles.exInput} placeholder="lbs" placeholderTextColor={Colors.textMuted} keyboardType="numeric" value={ex.weight?.toString() || ""} onChangeText={(v) => updateExercise(i, "weight", v)} />
                </View>
              </View>
            ))}
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} placeholder="Optional notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  tabBar: { flexDirection: "row", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabBtnIcon: { fontSize: 16 },
  tabBtnLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: "600" },
  tabBtnLabelActive: { color: Colors.primary },
  logBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 14, padding: 16, marginBottom: 20, gap: 8 },
  logBtnIcon: { fontSize: 22, color: "#0f172a", fontWeight: "bold" },
  logBtnText: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: Colors.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  exampleText: { fontSize: 12, color: Colors.textMuted, fontStyle: "italic", marginBottom: 12, lineHeight: 17, backgroundColor: Colors.surface, padding: 10, borderRadius: 8 },
  workoutCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  workoutCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  workoutIcon: { fontSize: 28 },
  workoutCardInfo: { flex: 1 },
  workoutName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  workoutMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  exerciseList: { paddingLeft: 40 },
  exerciseItem: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  moreExercises: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  chipScroll: { marginBottom: 12 },
  chip: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: "rgba(34,211,238,0.12)", borderColor: Colors.primary },
  chipIcon: { fontSize: 20, marginBottom: 2 },
  chipLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
  chipLabelActive: { color: Colors.primary },
  row: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  durationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  durationChipActive: { backgroundColor: "rgba(34,211,238,0.12)", borderColor: Colors.primary },
  durationChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  durationChipTextActive: { color: Colors.primary },
  intensityChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  intensityChipActive: { backgroundColor: "rgba(34,211,238,0.12)", borderColor: Colors.primary },
  intensityChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  intensityChipTextActive: { color: Colors.primary },
  textArea: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border, minHeight: 100, textAlignVertical: "top", marginBottom: 12 },
  generateBtn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 20 },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  aiPlanResult: { marginTop: 8 },
  aiPlanHeader: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  aiPlanTitle: { fontSize: 20, fontWeight: "800", color: Colors.primary, marginBottom: 8 },
  aiPlanMeta: { flexDirection: "row", gap: 12, marginBottom: 10, flexWrap: "wrap" },
  aiPlanMetaItem: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  aiPlanOverview: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  nutritionNote: { flexDirection: "row", gap: 10, backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.2)", alignItems: "flex-start" },
  nutritionNoteIcon: { fontSize: 18 },
  nutritionNoteText: { flex: 1, fontSize: 13, color: Colors.success, lineHeight: 18 },
  planSection: { backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  planSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  planSectionName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  planSectionMeta: { fontSize: 12, color: Colors.textSecondary },
  planSectionBody: { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: Colors.border },
  planSectionNote: { fontSize: 13, color: Colors.textMuted, fontStyle: "italic", marginBottom: 10 },
  planExercise: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  planExName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  planExMeta: { fontSize: 13, color: Colors.primary, fontWeight: "600", marginBottom: 2 },
  planExMuscle: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  planExInstructions: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  planExMod: { fontSize: 12, color: Colors.warning, marginTop: 4, fontStyle: "italic" },
  safetyNotes: { backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  safetyNotesTitle: { fontSize: 14, fontWeight: "700", color: Colors.warning, marginBottom: 6 },
  safetyNote: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4, lineHeight: 18 },
  parsedPreview: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  transcriptBox: { backgroundColor: Colors.background, borderRadius: 8, padding: 10, marginBottom: 12 },
  transcriptLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  transcriptText: { fontSize: 13, color: Colors.textSecondary, fontStyle: "italic", lineHeight: 18 },
  parsedSummaryRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  parsedStat: { alignItems: "center" },
  parsedStatVal: { fontSize: 24, fontWeight: "800", color: Colors.primary },
  parsedStatLabel: { fontSize: 11, color: Colors.textMuted },
  parsedSummaryText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18, fontStyle: "italic" },
  parsedExercise: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, marginBottom: 8 },
  parsedExHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  parsedExName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  parsedExType: { fontSize: 11, color: Colors.primary, fontWeight: "600", backgroundColor: "rgba(34,211,238,0.1)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  parsedExNotes: { fontSize: 13, color: Colors.primary, fontWeight: "600", marginBottom: 6 },
  parsedExStats: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  parsedExStat: { fontSize: 12, color: Colors.textMuted, backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  voiceCenter: { alignItems: "center", paddingVertical: 40 },
  recordBtn: { alignItems: "center", backgroundColor: Colors.primary, width: 120, height: 120, borderRadius: 60, justifyContent: "center", gap: 6 },
  recordBtnIcon: { fontSize: 40 },
  recordBtnText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  recordingIndicator: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.danger },
  recordingTime: { fontSize: 28, fontWeight: "800", color: Colors.textPrimary },
  stopBtn: { alignItems: "center", backgroundColor: Colors.danger, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, gap: 4 },
  stopBtnIcon: { fontSize: 24 },
  stopBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  voiceLoadingWrap: { alignItems: "center", gap: 12 },
  voiceLoadingText: { fontSize: 14, color: Colors.textSecondary },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  modalSave: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
  modalScroll: { flex: 1, padding: 16 },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  notesInput: { height: 80, textAlignVertical: "top" },
  halfField: { flex: 1 },
  typeRow: { flexDirection: "row", marginBottom: 4 },
  typeChip: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  typeChipActive: { backgroundColor: "rgba(34,211,238,0.12)", borderColor: Colors.primary },
  typeIcon: { fontSize: 22 },
  typeLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },
  typeLabelActive: { color: Colors.primary, fontWeight: "700" },
  exercisesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  addExBtn: { backgroundColor: "rgba(34,211,238,0.1)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary },
  addExBtnText: { color: Colors.primary, fontSize: 13, fontWeight: "600" },
  exerciseRow: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  exName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary, marginBottom: 8 },
  exFields: { flexDirection: "row", gap: 8, alignItems: "center" },
  exInput: { flex: 1, backgroundColor: Colors.background, borderRadius: 8, padding: 8, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border, textAlign: "center" },
  exRemove: { color: Colors.danger, fontSize: 16, paddingHorizontal: 4 },
  exercisePicker: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  exPickerRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  exPickerName: { fontSize: 14, color: Colors.textPrimary },
});
