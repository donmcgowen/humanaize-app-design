import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors } from "../../constants/colors";

export default function WorkoutsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Workouts</Text>
      <Text style={styles.subtitle}>Track your training sessions</Text>

      <TouchableOpacity style={styles.startBtn}>
        <Text style={styles.startBtnText}>+ Start Workout</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent Workouts</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🏋️</Text>
        <Text style={styles.emptyText}>No workouts logged yet</Text>
        <Text style={styles.emptySubtext}>Start your first session above</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  startBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: 16,
    alignItems: "center", marginBottom: 28,
  },
  startBtnText: { color: "#0f172a", fontWeight: "bold", fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 32,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, fontWeight: "600" },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
