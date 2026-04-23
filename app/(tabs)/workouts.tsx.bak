import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { format } from "date-fns";
import { Colors } from "../../constants/colors";
import { apiGetWorkouts, apiLogWorkout } from "../../lib/api";

const WORKOUT_TYPES = [
  { id: "strength", label: "Strength", icon: "🏋️" },
  { id: "cardio", label: "Cardio", icon: "🏃" },
  { id: "hiit", label: "HIIT", icon: "⚡" },
  { id: "yoga", label: "Yoga", icon: "🧘" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "other", label: "Other", icon: "🎯" },
];

const COMMON_EXERCISES: Record<string, string[]> = {
  strength: ["Bench Press", "Squat", "Deadlift", "Shoulder Press", "Pull-Up", "Barbell Row", "Bicep Curl", "Tricep Dip", "Leg Press", "Lat Pulldown"],
  cardio: ["Running", "Cycling", "Elliptical", "Rowing", "Swimming", "Jump Rope", "Stair Climber", "Walking"],
  hiit: ["Burpees", "Box Jumps", "Mountain Climbers", "Kettlebell Swing", "Battle Ropes", "Sprint Intervals"],
  yoga: ["Sun Salutation", "Warrior Pose", "Downward Dog", "Tree Pose", "Child's Pose"],
  sports: ["Basketball", "Soccer", "Tennis", "Golf", "Baseball", "Volleyball"],
  other: ["Stretching", "Foam Rolling", "Mobility Work", "Core Work"],
};

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
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
              {ex.name}
              {ex.sets && ex.reps ? ` — ${ex.sets}×${ex.reps}${ex.weight ? ` @ ${ex.weight}lbs` : ""}` : ""}
              {ex.duration ? ` — ${ex.duration} min` : ""}
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

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // New workout form
  const [workoutType, setWorkoutType] = useState("strength");
  const [workoutName, setWorkoutName] = useState("");
  const [duration, setDuration] = useState("45");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");

  async function loadWorkouts() {
    try {
      const data = await apiGetWorkouts().catch(() => []);
      setWorkouts(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }

  useState(() => { loadWorkouts(); });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  }, []);

  function addExercise(name: string) {
    setExercises((prev) => [...prev, { name, sets: 3, reps: 10 }]);
    setShowExercisePicker(false);
    setExerciseSearch("");
  }

  function updateExercise(i: number, field: keyof Exercise, value: string) {
    setExercises((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: field === "name" ? value : parseFloat(value) || undefined };
      return updated;
    });
  }

  function removeExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!workoutName.trim()) {
      Alert.alert("Missing Name", "Please enter a workout name.");
      return;
    }
    setSaving(true);
    try {
      await apiLogWorkout({
        type: workoutType,
        name: workoutName.trim(),
        duration: parseInt(duration) || 45,
        caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : undefined,
        exercises,
        notes: notes.trim() || undefined,
        date: format(new Date(), "yyyy-MM-dd"),
      });
      setShowModal(false);
      setWorkoutName("");
      setDuration("45");
      setCaloriesBurned("");
      setExercises([]);
      setNotes("");
      await loadWorkouts();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save workout.");
    }
    setSaving(false);
  }

  const suggestedExercises = (COMMON_EXERCISES[workoutType] ?? []).filter(
    (e) => !exerciseSearch || e.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          <TouchableOpacity style={styles.logBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.logBtnIcon}>+</Text>
            <Text style={styles.logBtnText}>Log Workout</Text>
          </TouchableOpacity>

          {workouts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyTitle}>No workouts yet</Text>
              <Text style={styles.emptySub}>Log your first workout to start tracking your fitness progress.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              {workouts.map((w) => <WorkoutCard key={w.id} workout={w} />)}
            </>
          )}
        </ScrollView>
      )}

      {/* Log Workout Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Workout</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {/* Workout Type */}
            <Text style={styles.fieldLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {WORKOUT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeChip, workoutType === t.id && styles.typeChipActive]}
                  onPress={() => setWorkoutType(t.id)}
                >
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text style={[styles.typeLabel, workoutType === t.id && styles.typeLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Workout Name</Text>
            <TextInput
              style={styles.input}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="e.g. Upper Body Push"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Duration (min)</Text>
                <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Calories Burned</Text>
                <TextInput style={styles.input} value={caloriesBurned} onChangeText={setCaloriesBurned} keyboardType="number-pad" placeholder="Optional" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>

            {/* Exercises */}
            <View style={styles.exercisesHeader}>
              <Text style={styles.fieldLabel}>Exercises</Text>
              <TouchableOpacity style={styles.addExBtn} onPress={() => setShowExercisePicker(true)}>
                <Text style={styles.addExBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseRow}>
                <Text style={styles.exName}>{ex.name}</Text>
                <View style={styles.exFields}>
                  <TextInput style={styles.exInput} value={String(ex.sets ?? "")} onChangeText={(v) => updateExercise(i, "sets", v)} keyboardType="number-pad" placeholder="Sets" placeholderTextColor={Colors.textMuted} />
                  <TextInput style={styles.exInput} value={String(ex.reps ?? "")} onChangeText={(v) => updateExercise(i, "reps", v)} keyboardType="number-pad" placeholder="Reps" placeholderTextColor={Colors.textMuted} />
                  <TextInput style={styles.exInput} value={String(ex.weight ?? "")} onChangeText={(v) => updateExercise(i, "weight", v)} keyboardType="decimal-pad" placeholder="lbs" placeholderTextColor={Colors.textMuted} />
                  <TouchableOpacity onPress={() => removeExercise(i)}>
                    <Text style={styles.exRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {showExercisePicker && (
              <View style={styles.exercisePicker}>
                <TextInput
                  style={styles.input}
                  value={exerciseSearch}
                  onChangeText={setExerciseSearch}
                  placeholder="Search exercises..."
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
                {suggestedExercises.map((name) => (
                  <TouchableOpacity key={name} style={styles.exPickerRow} onPress={() => addExercise(name)}>
                    <Text style={styles.exPickerName}>{name}</Text>
                  </TouchableOpacity>
                ))}
                {exerciseSearch.length > 2 && !suggestedExercises.find((e) => e.toLowerCase() === exerciseSearch.toLowerCase()) && (
                  <TouchableOpacity style={styles.exPickerRow} onPress={() => addExercise(exerciseSearch)}>
                    <Text style={[styles.exPickerName, { color: Colors.primary }]}>+ Add "{exerciseSearch}"</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  logBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 14, padding: 16, marginBottom: 20, gap: 8 },
  logBtnIcon: { fontSize: 22, color: "#0f172a", fontWeight: "bold" },
  logBtnText: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: Colors.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 },
  workoutCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  workoutCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  workoutIcon: { fontSize: 28 },
  workoutCardInfo: { flex: 1 },
  workoutName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  workoutMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  exerciseList: { paddingLeft: 40 },
  exerciseItem: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  moreExercises: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  modalSave: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
  modalScroll: { flex: 1, padding: 16 },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  notesInput: { height: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
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
