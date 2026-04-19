import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Colors } from "../../constants/colors";

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value} <Text style={styles.statUnit}>{unit}</Text></Text>
    </View>
  );
}

export default function MonitoringScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Monitoring</Text>
      <Text style={styles.subtitle}>Weight, measurements & health trends</Text>

      <Text style={styles.sectionTitle}>Current Stats</Text>
      <StatCard label="Weight" value="185" unit="lbs" color={Colors.primary} />
      <StatCard label="Goal Weight" value="175" unit="lbs" color={Colors.success} />
      <StatCard label="Weekly Loss Rate" value="1.2" unit="lbs/week" color={Colors.warning} />
      <StatCard label="Est. Goal Date" value="~8 weeks" unit="" color={Colors.secondary} />

      <Text style={styles.sectionTitle}>Body Measurements</Text>
      <StatCard label="Chest" value="—" unit="in" color={Colors.textMuted} />
      <StatCard label="Waist" value="—" unit="in" color={Colors.textMuted} />
      <StatCard label="Hips" value="—" unit="in" color={Colors.textMuted} />

      <View style={styles.aiCard}>
        <Text style={styles.aiTitle}>✨ AI Health Insights</Text>
        <Text style={styles.aiText}>
          Log your weight daily to unlock personalized trend analysis and goal projections.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 10, marginTop: 8 },
  statCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16,
    marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border,
  },
  statLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "bold" },
  statUnit: { fontSize: 14, fontWeight: "normal", color: Colors.textSecondary },
  aiCard: {
    backgroundColor: "#1a1040", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "#4c1d95", marginTop: 16,
  },
  aiTitle: { fontSize: 15, fontWeight: "700", color: "#a78bfa", marginBottom: 8 },
  aiText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
