import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { format, subDays, differenceInWeeks } from "date-fns";
import { Colors } from "../../constants/colors";
import { apiGetWeightHistory, apiLogWeight, apiGetMeasurements, apiLogMeasurement, apiGetProfile, apiAskAssistant } from "../../lib/api";

interface WeightEntry {
  id: number;
  weight: number;
  unit: string;
  date: string;
  notes?: string;
}

interface Measurement {
  id: number;
  date: string;
  chest?: number;
  waist?: number;
  hips?: number;
  neck?: number;
  thighs?: number;
  arms?: number;
  unit: string;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function WeightRow({ entry }: { entry: WeightEntry }) {
  return (
    <View style={styles.weightRow}>
      <View>
        <Text style={styles.weightDate}>{format(new Date(entry.date), "EEE, MMM d")}</Text>
        {entry.notes && <Text style={styles.weightNotes}>{entry.notes}</Text>}
      </View>
      <Text style={styles.weightVal}>{entry.weight} {entry.unit}</Text>
    </View>
  );
}

export default function MonitoringScreen() {
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Weight modal
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [weightNotes, setWeightNotes] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  // Measurements modal
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [neck, setNeck] = useState("");
  const [savingMeasure, setSavingMeasure] = useState(false);

  async function loadData() {
    try {
      const [wh, meas, prof] = await Promise.all([
        apiGetWeightHistory().catch(() => []),
        apiGetMeasurements().catch(() => []),
        apiGetProfile().catch(() => null),
      ]);
      setWeightHistory(Array.isArray(wh) ? wh : []);
      setMeasurements(Array.isArray(meas) ? meas : []);
      setProfile(prof);
    } catch {}
    setLoading(false);
  }

  useState(() => { loadData(); });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Calculate stats
  const latestWeight = weightHistory[0]?.weight;
  const startWeight = weightHistory[weightHistory.length - 1]?.weight;
  const goalWeight = profile?.goalWeight;
  const totalLost = startWeight && latestWeight ? +(startWeight - latestWeight).toFixed(1) : null;

  // Weekly rate
  let weeklyRate: number | null = null;
  let weeksToGoal: number | null = null;
  if (weightHistory.length >= 2) {
    const oldest = weightHistory[weightHistory.length - 1];
    const newest = weightHistory[0];
    const weeks = Math.max(differenceInWeeks(new Date(newest.date), new Date(oldest.date)), 1);
    const totalChange = oldest.weight - newest.weight;
    weeklyRate = +(totalChange / weeks).toFixed(2);
    if (goalWeight && latestWeight && weeklyRate > 0) {
      const remaining = latestWeight - goalWeight;
      weeksToGoal = Math.ceil(remaining / weeklyRate);
    }
  }

  async function handleLogWeight() {
    if (!weightInput.trim()) return;
    setSavingWeight(true);
    try {
      await apiLogWeight(parseFloat(weightInput), format(new Date(), "yyyy-MM-dd"), weightUnit);
      setShowWeightModal(false);
      setWeightInput("");
      setWeightNotes("");
      await loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not log weight.");
    }
    setSavingWeight(false);
  }

  async function handleLogMeasurements() {
    setSavingMeasure(true);
    try {
      await apiLogMeasurement({
        date: format(new Date(), "yyyy-MM-dd"),
        chest: chest ? parseFloat(chest) : undefined,
        waist: waist ? parseFloat(waist) : undefined,
        hips: hips ? parseFloat(hips) : undefined,
        neck: neck ? parseFloat(neck) : undefined,
        unit: "in",
      });
      setShowMeasureModal(false);
      setChest(""); setWaist(""); setHips(""); setNeck("");
      await loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save measurements.");
    }
    setSavingMeasure(false);
  }

  async function getAIInsight() {
    setLoadingInsight(true);
    try {
      const context = JSON.stringify({
        currentWeight: latestWeight,
        goalWeight,
        weeklyLossRate: weeklyRate,
        weeksToGoal,
        totalLost,
        profile: { goal: profile?.goal, age: profile?.age, height: profile?.height },
      });
      const result = await apiAskAssistant(
        "Analyze my weight loss progress and give me a brief, actionable insight and recommendation.",
        context
      );
      setAiInsight(result?.response ?? result?.message ?? "Keep up the great work! Consistency is key to reaching your goal.");
    } catch {
      setAiInsight("Stay consistent with your nutrition and exercise. Small daily habits lead to big results over time.");
    }
    setLoadingInsight(false);
  }

  const latestMeasure = measurements[0];

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
          {/* Weight Stats */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚖️ Weight Tracking</Text>
              <TouchableOpacity style={styles.logBtn} onPress={() => setShowWeightModal(true)}>
                <Text style={styles.logBtnText}>+ Log</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Current" value={latestWeight ? `${latestWeight} lbs` : "—"} color={Colors.primary} />
              <StatCard label="Goal" value={goalWeight ? `${goalWeight} lbs` : "—"} color={Colors.success} />
              <StatCard label="Total Lost" value={totalLost !== null && totalLost > 0 ? `-${totalLost} lbs` : "—"} color={Colors.secondary} />
            </View>

            {weeklyRate !== null && (
              <View style={styles.rateCard}>
                <View style={styles.rateItem}>
                  <Text style={styles.rateVal}>{weeklyRate > 0 ? `-${weeklyRate}` : `+${Math.abs(weeklyRate)}`} lbs/wk</Text>
                  <Text style={styles.rateLabel}>Weekly Rate</Text>
                </View>
                {weeksToGoal !== null && (
                  <View style={styles.rateItem}>
                    <Text style={[styles.rateVal, { color: Colors.success }]}>{weeksToGoal} weeks</Text>
                    <Text style={styles.rateLabel}>Est. to Goal</Text>
                  </View>
                )}
              </View>
            )}

            {/* Weight History */}
            {weightHistory.length > 0 ? (
              <View style={styles.historyList}>
                {weightHistory.slice(0, 7).map((entry) => (
                  <WeightRow key={entry.id} entry={entry} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No weight entries yet. Log your first weigh-in!</Text>
              </View>
            )}
          </View>

          {/* Body Measurements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📏 Measurements</Text>
              <TouchableOpacity style={styles.logBtn} onPress={() => setShowMeasureModal(true)}>
                <Text style={styles.logBtnText}>+ Log</Text>
              </TouchableOpacity>
            </View>

            {latestMeasure ? (
              <View style={styles.measureGrid}>
                {latestMeasure.chest && <View style={styles.measureItem}><Text style={styles.measureVal}>{latestMeasure.chest}"</Text><Text style={styles.measureLabel}>Chest</Text></View>}
                {latestMeasure.waist && <View style={styles.measureItem}><Text style={styles.measureVal}>{latestMeasure.waist}"</Text><Text style={styles.measureLabel}>Waist</Text></View>}
                {latestMeasure.hips && <View style={styles.measureItem}><Text style={styles.measureVal}>{latestMeasure.hips}"</Text><Text style={styles.measureLabel}>Hips</Text></View>}
                {latestMeasure.neck && <View style={styles.measureItem}><Text style={styles.measureVal}>{latestMeasure.neck}"</Text><Text style={styles.measureLabel}>Neck</Text></View>}
                <View style={styles.measureDate}>
                  <Text style={styles.measureDateText}>Last updated: {format(new Date(latestMeasure.date), "MMM d, yyyy")}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No measurements yet. Track chest, waist, and hips to monitor body composition.</Text>
              </View>
            )}
          </View>

          {/* AI Insights */}
          <View style={styles.aiSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✨ AI Insights</Text>
              <TouchableOpacity style={styles.logBtn} onPress={getAIInsight} disabled={loadingInsight}>
                <Text style={styles.logBtnText}>{loadingInsight ? "..." : "Refresh"}</Text>
              </TouchableOpacity>
            </View>
            {loadingInsight ? (
              <ActivityIndicator color={Colors.secondary} style={{ marginVertical: 16 }} />
            ) : aiInsight ? (
              <Text style={styles.aiText}>{aiInsight}</Text>
            ) : (
              <TouchableOpacity style={styles.aiPrompt} onPress={getAIInsight}>
                <Text style={styles.aiPromptText}>Tap "Refresh" to get a personalized AI analysis of your progress</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* Log Weight Modal */}
      <Modal visible={showWeightModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWeightModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Weight</Text>
            <TouchableOpacity onPress={handleLogWeight} disabled={savingWeight}>
              {savingWeight ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Weight</Text>
            <TextInput
              style={[styles.input, styles.bigInput]}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={styles.unitRow}>
              {["lbs", "kg"].map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, weightUnit === u && styles.unitChipActive]}
                  onPress={() => setWeightUnit(u)}
                >
                  <Text style={[styles.unitChipText, weightUnit === u && styles.unitChipTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={weightNotes}
              onChangeText={setWeightNotes}
              placeholder="e.g. Morning weigh-in"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
      </Modal>

      {/* Log Measurements Modal */}
      <Modal visible={showMeasureModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMeasureModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Measurements</Text>
            <TouchableOpacity onPress={handleLogMeasurements} disabled={savingMeasure}>
              {savingMeasure ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.measureHint}>All measurements in inches</Text>
            {[
              { label: "Chest", value: chest, setter: setChest },
              { label: "Waist", value: waist, setter: setWaist },
              { label: "Hips", value: hips, setter: setHips },
              { label: "Neck", value: neck, setter: setNeck },
            ].map(({ label, value, setter }) => (
              <View key={label}>
                <Text style={styles.fieldLabel}>{label} (in)</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setter}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            ))}
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
  section: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  aiSection: { backgroundColor: "#1a1040", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#4c1d95" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  logBtn: { backgroundColor: "rgba(34,211,238,0.1)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary },
  logBtnText: { color: Colors.primary, fontSize: 13, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: Colors.background, borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: 16, fontWeight: "bold", color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  statSub: { fontSize: 10, color: Colors.textMuted },
  rateCard: { flexDirection: "row", backgroundColor: Colors.background, borderRadius: 10, padding: 12, gap: 20, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  rateItem: { alignItems: "center" },
  rateVal: { fontSize: 18, fontWeight: "bold", color: Colors.primary },
  rateLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyList: { gap: 0 },
  weightRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  weightDate: { fontSize: 14, color: Colors.textPrimary },
  weightNotes: { fontSize: 12, color: Colors.textMuted },
  weightVal: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  emptyWrap: { paddingVertical: 16 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  measureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  measureItem: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, alignItems: "center", minWidth: 70, borderWidth: 1, borderColor: Colors.border },
  measureVal: { fontSize: 18, fontWeight: "bold", color: Colors.primary },
  measureLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  measureDate: { width: "100%", paddingTop: 8 },
  measureDateText: { fontSize: 11, color: Colors.textMuted },
  aiText: { fontSize: 14, color: "#c4b5fd", lineHeight: 22 },
  aiPrompt: { paddingVertical: 12 },
  aiPromptText: { color: "#7c3aed", fontSize: 13, textAlign: "center" },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  modalSave: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
  modalBody: { padding: 16 },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  bigInput: { fontSize: 32, fontWeight: "bold", textAlign: "center", padding: 20 },
  unitRow: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 4 },
  unitChip: { borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 20, paddingVertical: 10 },
  unitChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitChipText: { color: Colors.textSecondary, fontSize: 15 },
  unitChipTextActive: { color: "#0f172a", fontWeight: "700" },
  measureHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
});
