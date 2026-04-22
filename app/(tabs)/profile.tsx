import { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
  Image, Pressable, FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { format } from "date-fns";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/AuthContext";
import { apiGetProfile, apiUpdateProfile, apiLogout } from "../../lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HEALTH_CONDITIONS = [
  "Type 1 Diabetes", "Type 2 Diabetes", "Hypertension", "High Cholesterol",
  "Heart Disease", "Thyroid Disorder", "PCOS", "Celiac Disease",
  "Lactose Intolerance", "Kidney Disease", "None",
];

// Backend fitnessGoal values: "lose_fat" | "build_muscle" | "maintain"
const GOALS = [
  { id: "lose_fat", label: "Lose Weight", icon: "📉" },
  { id: "build_muscle", label: "Gain Muscle", icon: "💪" },
  { id: "maintain", label: "Maintain Weight", icon: "⚖️" },
];

// Backend activityLevel values: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active"
const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", sub: "Little or no exercise" },
  { id: "lightly_active", label: "Light", sub: "1-3 days/week" },
  { id: "moderately_active", label: "Moderate", sub: "3-5 days/week" },
  { id: "very_active", label: "Active", sub: "6-7 days/week" },
  { id: "extremely_active", label: "Very Active", sub: "Twice daily" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ── Calendar Date Picker Component ─────────────────────────────────────────────
function CalendarPicker({
  visible,
  value,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  value: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
}) {
  const today = new Date();
  const initial = value ? new Date(value + "T12:00:00") : new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selected, setSelected] = useState<string>(value || "");

  // Reset when opened
  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value + "T12:00:00") : new Date(today.getFullYear(), today.getMonth() + 1, 1);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(value || "");
    }
  }, [visible]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function pad(n: number) { return String(n).padStart(2, "0"); }
  function dateStr(day: number) {
    return `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={calStyles.overlay} onPress={onCancel} />
      <View style={calStyles.sheet}>
        {/* Header */}
        <View style={calStyles.sheetHeader}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={calStyles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={calStyles.sheetTitle}>Select Target Date</Text>
          <TouchableOpacity onPress={() => selected ? onConfirm(selected) : onCancel()}>
            <Text style={[calStyles.doneBtn, !selected && calStyles.doneBtnDisabled]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Month Navigation */}
        <View style={calStyles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={calStyles.navArrow}>
            <Text style={calStyles.navArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={calStyles.navArrow}>
            <Text style={calStyles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={calStyles.dayHeaders}>
          {DAY_NAMES.map(d => (
            <Text key={d} style={calStyles.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={calStyles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={calStyles.cell} />;
            const ds = dateStr(day);
            const isSelected = ds === selected;
            const isToday = ds === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
            return (
              <TouchableOpacity
                key={ds}
                style={[calStyles.cell, isSelected && calStyles.cellSelected, isToday && !isSelected && calStyles.cellToday]}
                onPress={() => setSelected(ds)}
              >
                <Text style={[calStyles.cellText, isSelected && calStyles.cellTextSelected, isToday && !isSelected && calStyles.cellTextToday]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected date display */}
        <View style={calStyles.selectedRow}>
          <Text style={calStyles.selectedLabel}>
            {selected ? `Selected: ${format(new Date(selected + "T12:00:00"), "MMMM d, yyyy")}` : "No date selected"}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Profile Row ────────────────────────────────────────────────────────────────
function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Text style={styles.profileRowValue}>{value || "—"}</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [goal, setGoal] = useState("lose_fat");
  const [activityLevel, setActivityLevel] = useState("moderately_active");
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState("");

  async function loadProfile() {
    try {
      const prof = await apiGetProfile().catch(() => null);
      setProfile(prof);
      if (prof) {
        setName(prof.name ?? user?.name ?? "");
        // Backend fields: ageYears, heightIn, weightLbs, goalWeightLbs, fitnessGoal, activityLevel, goalDate (ms)
        setAge(prof.ageYears ? String(prof.ageYears) : "");
        setHeight(prof.heightIn ? String(prof.heightIn) : "");
        setCurrentWeight(prof.weightLbs ? String(prof.weightLbs) : "");
        setGoalWeight(prof.goalWeightLbs ? String(prof.goalWeightLbs) : "");
        setGoal(prof.fitnessGoal ?? "lose_fat");
        setActivityLevel(prof.activityLevel ?? "moderately_active");
        // healthConditions is stored as JSON string in DB
        let hc: string[] = [];
        if (Array.isArray(prof.healthConditions)) hc = prof.healthConditions;
        else if (typeof prof.healthConditions === "string" && prof.healthConditions) {
          try { hc = JSON.parse(prof.healthConditions); } catch { hc = [prof.healthConditions]; }
        }
        setHealthConditions(hc);
        // goalDate is Unix ms timestamp → convert to YYYY-MM-DD
        if (prof.goalDate) {
          const d = new Date(Number(prof.goalDate));
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setTargetDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setTargetDate("");
        }
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadProfile(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, []);

  function toggleCondition(condition: string) {
    if (condition === "None") {
      setHealthConditions(["None"]);
      return;
    }
    setHealthConditions((prev) => {
      const filtered = prev.filter((c) => c !== "None");
      if (filtered.includes(condition)) return filtered.filter((c) => c !== condition);
      return [...filtered, condition];
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Map UI field names → backend schema field names
      const payload: Record<string, any> = {
        ageYears:      age ? parseInt(age, 10) : undefined,
        heightIn:      height ? parseInt(height, 10) : undefined,
        weightLbs:     currentWeight ? parseInt(currentWeight, 10) : undefined,
        goalWeightLbs: goalWeight ? parseInt(goalWeight, 10) : undefined,
        fitnessGoal:   goal as any,
        activityLevel: activityLevel as any,
        // healthConditions stored as JSON string
        healthConditions: healthConditions.length > 0
          ? JSON.stringify(healthConditions)
          : undefined,
        // goalDate: convert YYYY-MM-DD → Unix ms timestamp
        goalDate: targetDate
          ? new Date(targetDate + "T12:00:00").getTime()
          : undefined,
      };
      // Remove undefined keys so they don't overwrite existing data with null
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      await apiUpdateProfile(payload as any);
      setShowEditModal(false);
      await loadProfile();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save profile.");
    }
    setSaving(false);
  }

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out", style: "destructive",
        onPress: async () => {
          try {
            await apiLogout();
          } catch {}
          await AsyncStorage.removeItem("humanaize_session");
          await AsyncStorage.removeItem("humanaize_user");
          await AsyncStorage.removeItem("humanaize_token");
          await AsyncStorage.removeItem("session_token");
          setUser(null);
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  async function handleAddPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]) {
      Alert.alert("Photo Selected", "Progress photo upload coming soon!");
    }
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]) {
      Alert.alert("Photo Taken", "Progress photo upload coming soon!");
    }
  }

  const goalInfo = GOALS.find((g) => g.id === (profile?.fitnessGoal ?? "lose_fat"));
  const activityInfo = ACTIVITY_LEVELS.find((a) => a.id === (profile?.activityLevel ?? "moderately_active"));

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
          {/* User Header */}
          <View style={styles.userHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name ?? user?.username ?? "?")[0].toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name ?? user?.username}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Goal Card */}
          {goalInfo && (
            <View style={styles.goalCard}>
              <Text style={styles.goalIcon}>{goalInfo.icon}</Text>
              <View>
                <Text style={styles.goalLabel}>Current Goal</Text>
                <Text style={styles.goalValue}>{goalInfo.label}</Text>
              </View>
            </View>
          )}

          {/* Profile Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Profile</Text>
            <ProfileRow label="Age" value={profile?.ageYears ? `${profile.ageYears} years` : ""} />
            <ProfileRow label="Height" value={profile?.heightIn ? `${profile.heightIn} in` : ""} />
            <ProfileRow label="Current Weight" value={profile?.weightLbs ? `${profile.weightLbs} lbs` : ""} />
            <ProfileRow label="Goal Weight" value={profile?.goalWeightLbs ? `${profile.goalWeightLbs} lbs` : ""} />
            <ProfileRow label="Activity Level" value={activityInfo?.label ?? ""} />
            <ProfileRow label="Target Date" value={profile?.goalDate ? format(new Date(Number(profile.goalDate)), "MMM d, yyyy") : ""} />
          </View>

          {/* Health Conditions */}
          {profile?.healthConditions?.length > 0 && profile.healthConditions[0] !== "None" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏥 Health Conditions</Text>
              <View style={styles.conditionTags}>
                {profile.healthConditions.map((c: string) => (
                  <View key={c} style={styles.conditionTag}>
                    <Text style={styles.conditionTagText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Macro Targets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Daily Targets</Text>
            <View style={styles.targetsRow}>
              <View style={styles.targetItem}>
                <Text style={[styles.targetVal, { color: Colors.primary }]}>{profile?.dailyCalorieTarget ?? "—"}</Text>
                <Text style={styles.targetLabel}>Calories</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={[styles.targetVal, { color: Colors.protein }]}>{profile?.dailyProteinTarget ?? "—"}g</Text>
                <Text style={styles.targetLabel}>Protein</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={[styles.targetVal, { color: Colors.carbs }]}>{profile?.dailyCarbsTarget ?? "—"}g</Text>
                <Text style={styles.targetLabel}>Carbs</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={[styles.targetVal, { color: Colors.fat }]}>{profile?.dailyFatTarget ?? "—"}g</Text>
                <Text style={styles.targetLabel}>Fat</Text>
              </View>
            </View>
          </View>

          {/* Progress Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Progress Photos</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handleAddPhoto}>
                <Text style={styles.photoBtnIcon}>🖼️</Text>
                <Text style={styles.photoBtnText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.photoHint}>Progress photos help you visually track your transformation over time.</Text>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.textMuted} />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Height (in)</Text>
                <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Current Weight (lbs)</Text>
                <TextInput style={styles.input} value={currentWeight} onChangeText={setCurrentWeight} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Goal Weight (lbs)</Text>
                <TextInput style={styles.input} value={goalWeight} onChangeText={setGoalWeight} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Goal</Text>
            <View style={styles.goalOptions}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.goalOption, goal === g.id && styles.goalOptionActive]}
                  onPress={() => setGoal(g.id)}
                >
                  <Text style={styles.goalOptionIcon}>{g.icon}</Text>
                  <Text style={[styles.goalOptionLabel, goal === g.id && styles.goalOptionLabelActive]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Activity Level</Text>
            {ACTIVITY_LEVELS.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.activityOption, activityLevel === a.id && styles.activityOptionActive]}
                onPress={() => setActivityLevel(a.id)}
              >
                <Text style={[styles.activityLabel, activityLevel === a.id && styles.activityLabelActive]}>{a.label}</Text>
                <Text style={styles.activitySub}>{a.sub}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.fieldLabel}>Health Conditions</Text>
            <View style={styles.conditionOptions}>
              {HEALTH_CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.conditionOption, healthConditions.includes(c) && styles.conditionOptionActive]}
                  onPress={() => toggleCondition(c)}
                >
                  <Text style={[styles.conditionOptionText, healthConditions.includes(c) && styles.conditionOptionTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Target Date — Calendar Picker */}
            <Text style={styles.fieldLabel}>Target Date</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={targetDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                {targetDate ? format(new Date(targetDate + "T12:00:00"), "MMMM d, yyyy") : "Tap to select a date"}
              </Text>
              <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>
            {targetDate ? (
              <TouchableOpacity onPress={() => setTargetDate("")} style={styles.clearDateBtn}>
                <Text style={styles.clearDateText}>Clear date</Text>
              </TouchableOpacity>
            ) : null}

            {/* Bottom padding so last item isn't hidden behind keyboard */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Calendar Date Picker — slides up from bottom */}
      <CalendarPicker
        visible={showDatePicker}
        value={targetDate}
        onConfirm={(date) => { setTargetDate(date); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
}

// ── Calendar Styles ────────────────────────────────────────────────────────────
const calStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  cancelBtn: {
    fontSize: 15,
    color: "#94a3b8",
  },
  doneBtn: {
    fontSize: 15,
    fontWeight: "700",
    color: "#22d3ee",
  },
  doneBtnDisabled: {
    color: "#475569",
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  navArrow: {
    padding: 8,
  },
  navArrowText: {
    fontSize: 28,
    color: "#22d3ee",
    lineHeight: 28,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    paddingVertical: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cellSelected: {
    backgroundColor: "#22d3ee",
    borderRadius: 100,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: "#22d3ee",
    borderRadius: 100,
  },
  cellText: {
    fontSize: 14,
    color: "#cbd5e1",
  },
  cellTextSelected: {
    color: "#0f172a",
    fontWeight: "700",
  },
  cellTextToday: {
    color: "#22d3ee",
    fontWeight: "600",
  },
  selectedRow: {
    alignItems: "center",
    paddingTop: 12,
  },
  selectedLabel: {
    fontSize: 13,
    color: "#94a3b8",
  },
});

// ── Main Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  userHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 26, fontWeight: "bold", color: "#0f172a" },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "bold", color: Colors.textPrimary },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  editBtn: { backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border },
  editBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: "600" },
  goalCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "rgba(34,211,238,0.08)", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(34,211,238,0.2)" },
  goalIcon: { fontSize: 32 },
  goalLabel: { fontSize: 11, color: Colors.textMuted },
  goalValue: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  section: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 },
  profileRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  profileRowLabel: { fontSize: 14, color: Colors.textSecondary },
  profileRowValue: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  conditionTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  conditionTag: { backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  conditionTagText: { color: "#f87171", fontSize: 12, fontWeight: "600" },
  targetsRow: { flexDirection: "row", justifyContent: "space-around" },
  targetItem: { alignItems: "center" },
  targetVal: { fontSize: 20, fontWeight: "bold" },
  targetLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  photoActions: { flexDirection: "row", gap: 12, marginBottom: 10 },
  photoBtn: { flex: 1, backgroundColor: Colors.background, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  photoBtnIcon: { fontSize: 24, marginBottom: 4 },
  photoBtnText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  photoHint: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },
  logoutBtn: { backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", marginTop: 8 },
  logoutText: { color: Colors.danger, fontSize: 16, fontWeight: "700" },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  modalSave: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
  modalScroll: { flex: 1, padding: 16 },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  goalOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalOption: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  goalOptionActive: { backgroundColor: "rgba(34,211,238,0.1)", borderColor: Colors.primary },
  goalOptionIcon: { fontSize: 16 },
  goalOptionLabel: { fontSize: 13, color: Colors.textSecondary },
  goalOptionLabelActive: { color: Colors.primary, fontWeight: "700" },
  activityOption: { borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 6 },
  activityOptionActive: { backgroundColor: "rgba(34,211,238,0.1)", borderColor: Colors.primary },
  activityLabel: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  activityLabelActive: { color: Colors.primary },
  activitySub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  conditionOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  conditionOption: { borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 7 },
  conditionOptionActive: { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.4)" },
  conditionOptionText: { fontSize: 13, color: Colors.textSecondary },
  conditionOptionTextActive: { color: "#f87171", fontWeight: "600" },
  // Date Picker Button
  datePickerBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datePickerText: { fontSize: 15, color: Colors.textPrimary },
  datePickerPlaceholder: { fontSize: 15, color: Colors.textMuted },
  datePickerIcon: { fontSize: 18 },
  clearDateBtn: { marginTop: 6, alignSelf: "flex-end" },
  clearDateText: { fontSize: 12, color: Colors.textMuted, textDecorationLine: "underline" },
});
