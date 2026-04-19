import { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
  Image,
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

const GOALS = [
  { id: "lose_weight", label: "Lose Weight", icon: "📉" },
  { id: "gain_muscle", label: "Gain Muscle", icon: "💪" },
  { id: "maintain", label: "Maintain Weight", icon: "⚖️" },
  { id: "improve_health", label: "Improve Health", icon: "❤️" },
  { id: "athletic_performance", label: "Athletic Performance", icon: "🏆" },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", sub: "Little or no exercise" },
  { id: "light", label: "Light", sub: "1-3 days/week" },
  { id: "moderate", label: "Moderate", sub: "3-5 days/week" },
  { id: "active", label: "Active", sub: "6-7 days/week" },
  { id: "very_active", label: "Very Active", sub: "Twice daily" },
];

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Text style={styles.profileRowValue}>{value || "—"}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [goal, setGoal] = useState("lose_weight");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState("");

  async function loadProfile() {
    try {
      const prof = await apiGetProfile().catch(() => null);
      setProfile(prof);
      if (prof) {
        setName(prof.name ?? user?.name ?? "");
        setAge(prof.age ? String(prof.age) : "");
        setHeight(prof.height ? String(prof.height) : "");
        setCurrentWeight(prof.currentWeight ? String(prof.currentWeight) : "");
        setGoalWeight(prof.goalWeight ? String(prof.goalWeight) : "");
        setGoal(prof.goal ?? "lose_weight");
        setActivityLevel(prof.activityLevel ?? "moderate");
        setHealthConditions(prof.healthConditions ?? []);
        setTargetDate(prof.targetDate ?? "");
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
      await apiUpdateProfile({
        name: name.trim() || undefined,
        age: age ? parseInt(age) : undefined,
        height: height ? parseFloat(height) : undefined,
        currentWeight: currentWeight ? parseFloat(currentWeight) : undefined,
        goalWeight: goalWeight ? parseFloat(goalWeight) : undefined,
        goal,
        activityLevel,
        healthConditions,
        targetDate: targetDate || undefined,
      });
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

  const goalInfo = GOALS.find((g) => g.id === (profile?.goal ?? "lose_weight"));
  const activityInfo = ACTIVITY_LEVELS.find((a) => a.id === (profile?.activityLevel ?? "moderate"));

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
            <ProfileRow label="Age" value={profile?.age ? `${profile.age} years` : ""} />
            <ProfileRow label="Height" value={profile?.height ? `${profile.height} in` : ""} />
            <ProfileRow label="Current Weight" value={profile?.currentWeight ? `${profile.currentWeight} lbs` : ""} />
            <ProfileRow label="Goal Weight" value={profile?.goalWeight ? `${profile.goalWeight} lbs` : ""} />
            <ProfileRow label="Activity Level" value={activityInfo?.label ?? ""} />
            <ProfileRow label="Target Date" value={profile?.targetDate ? format(new Date(profile.targetDate), "MMM d, yyyy") : ""} />
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
                <Text style={[styles.targetVal, { color: Colors.protein }]}>{profile?.proteinTarget ?? "—"}g</Text>
                <Text style={styles.targetLabel}>Protein</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={[styles.targetVal, { color: Colors.carbs }]}>{profile?.carbTarget ?? "—"}g</Text>
                <Text style={styles.targetLabel}>Carbs</Text>
              </View>
              <View style={styles.targetItem}>
                <Text style={[styles.targetVal, { color: Colors.fat }]}>{profile?.fatTarget ?? "—"}g</Text>
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

          <ScrollView style={styles.modalScroll}>
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

            <Text style={styles.fieldLabel}>Target Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={targetDate} onChangeText={setTargetDate} placeholder="2025-12-31" placeholderTextColor={Colors.textMuted} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

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
});
