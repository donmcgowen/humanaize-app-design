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
import {
  apiGetProfile, apiUpdateProfile, apiLogout,
  apiGetProgressPhotos, apiUploadProgressPhoto, apiDeleteProgressPhoto, apiAnalyzeBodyPhoto,
} from "../../lib/api";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
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
interface ProgressPhoto {
  id: number;
  photoName: string;
  photoDate: number;
  description?: string;
  photoUrl?: string;
  photoBase64?: string;
  createdAt: number;
}

interface BodyAnalysis {
  estimatedBodyFatPercent: number | null;
  estimatedMuscleMass: string;
  overallHealthRating: string;
  bmi: number | null;
  positiveAreas: string[];
  areasForImprovement: string[];
  primaryRecommendation: string;
  recommendationReason: string;
  actionPlan: string[];
  nutritionTips: string[];
  disclaimer: string;
}

export default function ProfileScreen() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Progress Photos state
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoNameModal, setShowPhotoNameModal] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingPhotoName, setPendingPhotoName] = useState("");
  const [pendingPhotoDesc, setPendingPhotoDesc] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnalysis | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

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

  useEffect(() => { loadProfile(); loadProgressPhotos(); }, []);

  async function loadProgressPhotos() {
    setPhotosLoading(true);
    try {
      const photos = await apiGetProgressPhotos();
      if (Array.isArray(photos)) setProgressPhotos(photos as ProgressPhoto[]);
    } catch (e) { console.error("Failed to load progress photos:", e); }
    finally { setPhotosLoading(false); }
  }

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

  // Resize image to max 1MB before upload
  async function resizeAndEncodePhoto(uri: string): Promise<{ base64: string; mimeType: string }> {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return { base64: manipResult.base64 ?? "", mimeType: "image/jpeg" };
  }

  async function handleAddPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Please allow access to your photo library."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]) {
      setPendingPhotoUri(result.assets[0].uri);
      setPendingPhotoName(format(new Date(), "MMM d, yyyy"));
      setPendingPhotoDesc("");
      setShowPhotoNameModal(true);
    }
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Please allow camera access."); return; }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]) {
      setPendingPhotoUri(result.assets[0].uri);
      setPendingPhotoName(format(new Date(), "MMM d, yyyy"));
      setPendingPhotoDesc("");
      setShowPhotoNameModal(true);
    }
  }

  async function confirmUploadPhoto() {
    if (!pendingPhotoUri) return;
    setUploadingPhoto(true);
    setShowPhotoNameModal(false);
    try {
      const { base64, mimeType } = await resizeAndEncodePhoto(pendingPhotoUri);
      await apiUploadProgressPhoto({
        photoBase64: `data:${mimeType};base64,${base64}`,
        photoName: pendingPhotoName || format(new Date(), "MMM d, yyyy"),
        photoDate: Date.now(),
        description: pendingPhotoDesc || undefined,
      });
      await loadProgressPhotos();
      Alert.alert("Saved!", "Progress photo uploaded.");
    } catch (e: any) {
      Alert.alert("Upload Error", e.message || "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
      setPendingPhotoUri(null);
    }
  }

  async function handleDeletePhoto(photo: ProgressPhoto) {
    Alert.alert("Delete Photo", `Delete "${photo.photoName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await apiDeleteProgressPhoto(photo.id);
            await loadProgressPhotos();
            setShowPhotoModal(false);
            setSelectedPhoto(null);
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete photo.");
          }
        },
      },
    ]);
  }

  async function handleAnalyzePhoto(photo: ProgressPhoto) {
    if (!photo.photoBase64 && !photo.photoUrl) {
      Alert.alert("No image data", "This photo cannot be analyzed.");
      return;
    }
    setAnalyzingPhoto(true);
    setBodyAnalysis(null);
    try {
      let base64 = photo.photoBase64 || "";
      if (!base64 && photo.photoUrl) {
        // Download from URL and convert to base64
        const downloadResult = await FileSystem.downloadAsync(
          photo.photoUrl,
          FileSystem.cacheDirectory + "analysis_photo.jpg"
        );
        base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      // Strip data: prefix if present
      const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, "");
      const analysis = await apiAnalyzeBodyPhoto(cleanBase64, "image/jpeg");
      setBodyAnalysis(analysis as BodyAnalysis);
    } catch (e: any) {
      Alert.alert("Analysis Error", e.message || "Failed to analyze photo. Ensure it is a clear full-body photo.");
    } finally {
      setAnalyzingPhoto(false);
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
            <View style={styles.photoSectionHeader}>
              <Text style={styles.sectionTitle}>📸 Progress Photos</Text>
              {uploadingPhoto && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} disabled={uploadingPhoto}>
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handleAddPhoto} disabled={uploadingPhoto}>
                <Text style={styles.photoBtnIcon}>🖼️</Text>
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            {photosLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
            ) : progressPhotos.length === 0 ? (
              <Text style={styles.photoHint}>No progress photos yet. Take or upload your first photo to start tracking your transformation.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
                {progressPhotos.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={styles.photoThumb}
                    onPress={() => { setSelectedPhoto(photo); setBodyAnalysis(null); setShowPhotoModal(true); }}
                  >
                    {photo.photoUrl || photo.photoBase64 ? (
                      <Image
                        source={{ uri: photo.photoUrl || (photo.photoBase64?.startsWith("data:") ? photo.photoBase64 : `data:image/jpeg;base64,${photo.photoBase64}`) }}
                        style={styles.photoThumbImg}
                      />
                    ) : (
                      <View style={[styles.photoThumbImg, styles.photoThumbPlaceholder]}>
                        <Text style={{ fontSize: 28 }}>📷</Text>
                      </View>
                    )}
                    <Text style={styles.photoThumbLabel} numberOfLines={1}>{photo.photoName}</Text>
                    <Text style={styles.photoThumbDate}>{format(new Date(photo.photoDate), "MMM d")}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Photo Name Modal */}
      <Modal visible={showPhotoNameModal} animationType="slide" transparent>
        <View style={styles.photoNameOverlay}>
          <View style={styles.photoNameSheet}>
            <Text style={styles.photoNameTitle}>Name Your Photo</Text>
            {pendingPhotoUri && (
              <Image source={{ uri: pendingPhotoUri }} style={styles.photoNamePreview} />
            )}
            <Text style={styles.fieldLabel}>Photo Name</Text>
            <TextInput
              style={styles.input}
              value={pendingPhotoName}
              onChangeText={setPendingPhotoName}
              placeholder={format(new Date(), "MMM d, yyyy")}
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: "top" }]}
              value={pendingPhotoDesc}
              onChangeText={setPendingPhotoDesc}
              placeholder="e.g. Week 4 check-in, front view..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <View style={styles.photoNameBtns}>
              <TouchableOpacity style={styles.photoNameCancel} onPress={() => { setShowPhotoNameModal(false); setPendingPhotoUri(null); }}>
                <Text style={styles.photoNameCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoNameSave} onPress={confirmUploadPhoto}>
                <Text style={styles.photoNameSaveText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Detail Modal */}
      <Modal visible={showPhotoModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.photoDetailContainer}>
          <View style={styles.photoDetailHeader}>
            <TouchableOpacity onPress={() => { setShowPhotoModal(false); setSelectedPhoto(null); setBodyAnalysis(null); }}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedPhoto?.photoName ?? "Photo"}</Text>
            <TouchableOpacity onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}>
              <Text style={styles.deletePhotoBtn}>Delete</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.photoDetailScroll}>
            {selectedPhoto && (selectedPhoto.photoUrl || selectedPhoto.photoBase64) && (
              <Image
                source={{ uri: selectedPhoto.photoUrl || (selectedPhoto.photoBase64?.startsWith("data:") ? selectedPhoto.photoBase64 : `data:image/jpeg;base64,${selectedPhoto.photoBase64}`) }}
                style={styles.photoDetailImg}
                resizeMode="contain"
              />
            )}
            <View style={styles.photoDetailMeta}>
              <Text style={styles.photoDetailName}>{selectedPhoto?.photoName}</Text>
              <Text style={styles.photoDetailDate}>{selectedPhoto ? format(new Date(selectedPhoto.photoDate), "MMMM d, yyyy") : ""}</Text>
              {selectedPhoto?.description ? <Text style={styles.photoDetailDesc}>{selectedPhoto.description}</Text> : null}
            </View>

            {/* AI Body Analysis */}
            <TouchableOpacity
              style={[styles.analyzeBtn, analyzingPhoto && styles.analyzeBtnDisabled]}
              onPress={() => selectedPhoto && handleAnalyzePhoto(selectedPhoto)}
              disabled={analyzingPhoto}
            >
              {analyzingPhoto ? (
                <><ActivityIndicator color="#0f172a" /><Text style={styles.analyzeBtnText}>  Analyzing...</Text></>
              ) : (
                <Text style={styles.analyzeBtnText}>🤖 AI Body Analysis</Text>
              )}
            </TouchableOpacity>

            {bodyAnalysis && (
              <View style={styles.analysisResult}>
                <Text style={styles.analysisTitle}>Body Composition Analysis</Text>

                {/* Key Metrics */}
                <View style={styles.analysisMetrics}>
                  {bodyAnalysis.estimatedBodyFatPercent !== null && (
                    <View style={styles.analysisStat}>
                      <Text style={styles.analysisStatVal}>{bodyAnalysis.estimatedBodyFatPercent}%</Text>
                      <Text style={styles.analysisStatLabel}>Body Fat</Text>
                    </View>
                  )}
                  {bodyAnalysis.bmi !== null && (
                    <View style={styles.analysisStat}>
                      <Text style={styles.analysisStatVal}>{bodyAnalysis.bmi?.toFixed(1)}</Text>
                      <Text style={styles.analysisStatLabel}>BMI</Text>
                    </View>
                  )}
                  <View style={styles.analysisStat}>
                    <Text style={styles.analysisStatVal}>{bodyAnalysis.estimatedMuscleMass}</Text>
                    <Text style={styles.analysisStatLabel}>Muscle Mass</Text>
                  </View>
                  <View style={styles.analysisStat}>
                    <Text style={[styles.analysisStatVal, {
                      color: bodyAnalysis.overallHealthRating === "healthy" ? Colors.success :
                        bodyAnalysis.overallHealthRating === "underweight" ? Colors.warning : Colors.danger
                    }]}>{bodyAnalysis.overallHealthRating}</Text>
                    <Text style={styles.analysisStatLabel}>Rating</Text>
                  </View>
                </View>

                {/* Recommendation */}
                <View style={styles.analysisRecommendation}>
                  <Text style={styles.analysisRecTitle}>
                    {bodyAnalysis.primaryRecommendation === "fat_loss" ? "🔥 Recommendation: Fat Loss" :
                      bodyAnalysis.primaryRecommendation === "muscle_gain" ? "💪 Recommendation: Muscle Gain" :
                        bodyAnalysis.primaryRecommendation === "recomposition" ? "⚖️ Recommendation: Body Recomposition" :
                          "✅ Recommendation: Maintain"}
                  </Text>
                  <Text style={styles.analysisRecReason}>{bodyAnalysis.recommendationReason}</Text>
                </View>

                {/* Positive Areas */}
                {bodyAnalysis.positiveAreas.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>✅ Positive Areas</Text>
                    {bodyAnalysis.positiveAreas.map((item, i) => (
                      <Text key={i} style={styles.analysisItem}>• {item}</Text>
                    ))}
                  </View>
                )}

                {/* Areas for Improvement */}
                {bodyAnalysis.areasForImprovement.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>📈 Areas for Improvement</Text>
                    {bodyAnalysis.areasForImprovement.map((item, i) => (
                      <Text key={i} style={styles.analysisItem}>• {item}</Text>
                    ))}
                  </View>
                )}

                {/* Action Plan */}
                {bodyAnalysis.actionPlan.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>🗓️ Action Plan</Text>
                    {bodyAnalysis.actionPlan.map((item, i) => (
                      <Text key={i} style={styles.analysisItem}>{i + 1}. {item}</Text>
                    ))}
                  </View>
                )}

                {/* Nutrition Tips */}
                {bodyAnalysis.nutritionTips.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>🥗 Nutrition Tips</Text>
                    {bodyAnalysis.nutritionTips.map((item, i) => (
                      <Text key={i} style={styles.analysisItem}>• {item}</Text>
                    ))}
                  </View>
                )}

                <Text style={styles.analysisDisclaimer}>{bodyAnalysis.disclaimer}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

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
  // Progress Photos
  photoSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  photoGallery: { marginTop: 8 },
  photoThumb: { width: 100, marginRight: 10, alignItems: "center" },
  photoThumbImg: { width: 100, height: 130, borderRadius: 10, backgroundColor: Colors.background },
  photoThumbPlaceholder: { justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  photoThumbLabel: { fontSize: 11, color: Colors.textPrimary, fontWeight: "600", marginTop: 4, textAlign: "center" },
  photoThumbDate: { fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  // Photo Name Modal
  photoNameOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  photoNameSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  photoNameTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary, textAlign: "center", marginBottom: 16 },
  photoNamePreview: { width: "100%", height: 180, borderRadius: 12, marginBottom: 12, resizeMode: "cover" },
  photoNameBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  photoNameCancel: { flex: 1, backgroundColor: Colors.background, borderRadius: 10, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  photoNameCancelText: { color: Colors.textSecondary, fontSize: 15, fontWeight: "600" },
  photoNameSave: { flex: 2, backgroundColor: Colors.primary, borderRadius: 10, padding: 14, alignItems: "center" },
  photoNameSaveText: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
  // Photo Detail Modal
  photoDetailContainer: { flex: 1, backgroundColor: Colors.background },
  photoDetailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  deletePhotoBtn: { color: Colors.danger, fontSize: 15, fontWeight: "600" },
  photoDetailScroll: { flex: 1 },
  photoDetailImg: { width: "100%", height: 360, backgroundColor: Colors.surface },
  photoDetailMeta: { padding: 16 },
  photoDetailName: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  photoDetailDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  photoDetailDesc: { fontSize: 13, color: Colors.textMuted, marginTop: 8, fontStyle: "italic" },
  // AI Analysis
  analyzeBtn: { marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  analyzeBtnDisabled: { opacity: 0.6 },
  analyzeBtnText: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
  analysisResult: { margin: 16, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 40 },
  analysisTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 14, textAlign: "center" },
  analysisMetrics: { flexDirection: "row", justifyContent: "space-around", marginBottom: 16, backgroundColor: Colors.background, borderRadius: 12, padding: 12 },
  analysisStat: { alignItems: "center" },
  analysisStatVal: { fontSize: 18, fontWeight: "bold", color: Colors.primary },
  analysisStatLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  analysisRecommendation: { backgroundColor: "rgba(34,211,238,0.08)", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(34,211,238,0.2)" },
  analysisRecTitle: { fontSize: 14, fontWeight: "700", color: Colors.primary, marginBottom: 6 },
  analysisRecReason: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  analysisSection: { marginBottom: 12 },
  analysisSectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary, marginBottom: 6 },
  analysisItem: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 2 },
  analysisDisclaimer: { fontSize: 11, color: Colors.textMuted, fontStyle: "italic", marginTop: 12, textAlign: "center", lineHeight: 16 },
});
