import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Colors } from "../../constants/colors";

function MacroCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={[styles.macroCard, { borderTopColor: color }]}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Good morning 👋</Text>
        <Text style={styles.dateText}>Sunday, April 19</Text>
      </View>

      {/* Daily Calories Ring placeholder */}
      <View style={styles.caloriesCard}>
        <View style={styles.caloriesRing}>
          <Text style={styles.caloriesValue}>1,240</Text>
          <Text style={styles.caloriesLabel}>of 2,000 kcal</Text>
        </View>
        <Text style={styles.caloriesRemaining}>760 kcal remaining</Text>
      </View>

      {/* Macro breakdown */}
      <Text style={styles.sectionTitle}>Today's Macros</Text>
      <View style={styles.macroRow}>
        <MacroCard label="Protein" value="86" unit="g" color={Colors.protein} />
        <MacroCard label="Carbs" value="142" unit="g" color={Colors.carbs} />
        <MacroCard label="Fat" value="38" unit="g" color={Colors.fat} />
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Add</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickBtnIcon}>🍎</Text>
          <Text style={styles.quickBtnText}>Log Food</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickBtnIcon}>🏋️</Text>
          <Text style={styles.quickBtnText}>Log Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn}>
          <Text style={styles.quickBtnIcon}>⚖️</Text>
          <Text style={styles.quickBtnText}>Log Weight</Text>
        </TouchableOpacity>
      </View>

      {/* AI Insight placeholder */}
      <View style={styles.aiCard}>
        <Text style={styles.aiTitle}>✨ AI Insight</Text>
        <Text style={styles.aiText}>
          You're on track with your protein goal. Consider adding a post-workout shake to hit your 150g target.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: "bold", color: Colors.textPrimary },
  dateText: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  caloriesCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 24,
    alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: Colors.border,
  },
  caloriesRing: { alignItems: "center", marginBottom: 8 },
  caloriesValue: { fontSize: 48, fontWeight: "bold", color: Colors.primary },
  caloriesLabel: { fontSize: 14, color: Colors.textSecondary },
  caloriesRemaining: { fontSize: 14, color: Colors.success, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 },
  macroRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  macroCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    alignItems: "center", borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border,
  },
  macroValue: { fontSize: 24, fontWeight: "bold" },
  macroUnit: { fontSize: 12, color: Colors.textMuted },
  macroLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  quickActions: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border,
  },
  quickBtnIcon: { fontSize: 24, marginBottom: 6 },
  quickBtnText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  aiCard: {
    backgroundColor: "#1a1040", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "#4c1d95",
  },
  aiTitle: { fontSize: 15, fontWeight: "700", color: "#a78bfa", marginBottom: 8 },
  aiText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
