import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors } from "../../constants/colors";

export default function FoodScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Food Log</Text>
      <Text style={styles.subtitle}>Track your daily nutrition</Text>

      {/* Meal sections */}
      {["Breakfast", "Lunch", "Dinner", "Snacks"].map((meal) => (
        <View key={meal} style={styles.mealCard}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>{meal}</Text>
            <Text style={styles.mealCals}>0 kcal</Text>
          </View>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add Food</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Barcode / AI scan button */}
      <TouchableOpacity style={styles.scanBtn}>
        <Text style={styles.scanBtnIcon}>📷</Text>
        <Text style={styles.scanBtnText}>Scan Barcode or Label</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  mealCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  mealTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  mealCals: { fontSize: 14, color: Colors.textSecondary },
  addBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: 10, alignItems: "center", borderStyle: "dashed",
  },
  addBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
  scanBtn: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 18,
    alignItems: "center", flexDirection: "row", justifyContent: "center",
    gap: 10, borderWidth: 1, borderColor: Colors.primary, marginTop: 8,
  },
  scanBtnIcon: { fontSize: 22 },
  scanBtnText: { color: Colors.primary, fontSize: 16, fontWeight: "600" },
});
