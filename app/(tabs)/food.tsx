import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Modal, TextInput, ActivityIndicator,
  Alert, FlatList, KeyboardAvoidingView, Platform,
} from "react-native";
import { format, addDays, subDays } from "date-fns";
import { Colors } from "../../constants/colors";
import { apiGetFoodLog, apiAddFoodEntry, apiDeleteFoodEntry, apiSearchFood } from "../../lib/api";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

interface FoodEntry {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: string;
  amount: number;
  unit: string;
}

interface SearchResult {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.macroChip, { borderColor: color }]}>
      <Text style={[styles.macroChipVal, { color }]}>{Math.round(value)}g</Text>
      <Text style={styles.macroChipLabel}>{label}</Text>
    </View>
  );
}

function FoodEntryRow({ entry, onDelete }: { entry: FoodEntry; onDelete: () => void }) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryInfo}>
        <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
        <Text style={styles.entryMeta}>{entry.amount} {entry.unit} · {Math.round(entry.calories)} kcal</Text>
        <View style={styles.entryMacros}>
          <Text style={[styles.entryMacro, { color: Colors.protein }]}>P: {Math.round(entry.protein)}g</Text>
          <Text style={[styles.entryMacro, { color: Colors.carbs }]}>C: {Math.round(entry.carbs)}g</Text>
          <Text style={[styles.entryMacro, { color: Colors.fat }]}>F: {Math.round(entry.fat)}g</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FoodScreen() {
  const [date, setDate] = useState(new Date());
  const [foodLog, setFoodLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add food modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMeal, setActiveMeal] = useState("Breakfast");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [adding, setAdding] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  async function loadLog() {
    try {
      const log = await apiGetFoodLog(dateStr).catch(() => null);
      setFoodLog(log);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { setLoading(true); loadLog(); }, [dateStr]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLog();
    setRefreshing(false);
  }, [dateStr]);

  const entries: FoodEntry[] = foodLog?.entries ?? [];

  function getMealEntries(meal: string) {
    return entries.filter((e) => e.meal?.toLowerCase() === meal.toLowerCase());
  }

  function getMealCals(meal: string) {
    return Math.round(getMealEntries(meal).reduce((s, e) => s + (e.calories ?? 0), 0));
  }

  const totalCals = Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0));
  const totalProtein = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat ?? 0), 0);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const results = await apiSearchFood(searchQuery.trim());
      setSearchResults(Array.isArray(results) ? results : []);
    } catch {
      Alert.alert("Search Error", "Could not search foods. Try again.");
    }
    setSearching(false);
  }

  function handleSelectFood(food: SearchResult) {
    setSelectedFood(food);
    setAmount("1");
    setUnit("serving");
  }

  async function handleAddFood() {
    if (!selectedFood) return;
    setAdding(true);
    try {
      const multiplier = parseFloat(amount) || 1;
      await apiAddFoodEntry({
        name: selectedFood.name,
        calories: Math.round(selectedFood.calories * multiplier),
        protein: Math.round(selectedFood.protein * multiplier),
        carbs: Math.round(selectedFood.carbs * multiplier),
        fat: Math.round(selectedFood.fat * multiplier),
        meal: activeMeal,
        amount: multiplier,
        unit,
        date: dateStr,
      });
      setShowAddModal(false);
      setSelectedFood(null);
      setSearchQuery("");
      setSearchResults([]);
      await loadLog();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not add food.");
    }
    setAdding(false);
  }

  async function handleDelete(id: number) {
    Alert.alert("Remove Food", "Remove this food entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            await apiDeleteFoodEntry(id);
            await loadLog();
          } catch {
            Alert.alert("Error", "Could not remove entry.");
          }
        },
      },
    ]);
  }

  function openAddModal(meal: string) {
    setActiveMeal(meal);
    setSelectedFood(null);
    setSearchQuery("");
    setSearchResults([]);
    setShowAddModal(true);
  }

  return (
    <View style={styles.container}>
      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => setDate(subDays(date, 1))}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateCenterWrap}>
          <Text style={styles.dateText}>{isToday ? "Today" : format(date, "EEE, MMM d")}</Text>
          <Text style={styles.dateSub}>{format(date, "MMMM d, yyyy")}</Text>
        </View>
        <TouchableOpacity
          style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
          onPress={() => !isToday && setDate(addDays(date, 1))}
          disabled={isToday}
        >
          <Text style={[styles.dateArrowText, isToday && { color: Colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Totals Bar */}
      <View style={styles.totalsBar}>
        <View style={styles.totalItem}>
          <Text style={[styles.totalVal, { color: Colors.primary }]}>{totalCals}</Text>
          <Text style={styles.totalLabel}>kcal</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalVal, { color: Colors.protein }]}>{Math.round(totalProtein)}g</Text>
          <Text style={styles.totalLabel}>Protein</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalVal, { color: Colors.carbs }]}>{Math.round(totalCarbs)}g</Text>
          <Text style={styles.totalLabel}>Carbs</Text>
        </View>
        <View style={styles.totalDivider} />
        <View style={styles.totalItem}>
          <Text style={[styles.totalVal, { color: Colors.fat }]}>{Math.round(totalFat)}g</Text>
          <Text style={styles.totalLabel}>Fat</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {MEALS.map((meal) => {
            const mealEntries = getMealEntries(meal);
            const mealCals = getMealCals(meal);
            return (
              <View key={meal} style={styles.mealSection}>
                <View style={styles.mealHeader}>
                  <View>
                    <Text style={styles.mealTitle}>{meal}</Text>
                    {mealCals > 0 && <Text style={styles.mealCals}>{mealCals} kcal</Text>}
                  </View>
                  <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal(meal)}>
                    <Text style={styles.addBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>

                {mealEntries.length === 0 ? (
                  <TouchableOpacity style={styles.emptyMeal} onPress={() => openAddModal(meal)}>
                    <Text style={styles.emptyMealText}>Tap to add food</Text>
                  </TouchableOpacity>
                ) : (
                  mealEntries.map((entry) => (
                    <FoodEntryRow key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} />
                  ))
                )}
              </View>
            );
          })}

          {/* Scan Button */}
          <TouchableOpacity style={styles.scanBtn}>
            <Text style={styles.scanIcon}>📷</Text>
            <View>
              <Text style={styles.scanTitle}>Scan Barcode or Label</Text>
              <Text style={styles.scanSub}>Auto-detect food & macros with AI</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Add Food Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAddModal(false); setSelectedFood(null); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add to {activeMeal}</Text>
            <View style={{ width: 60 }} />
          </View>

          {!selectedFood ? (
            <>
              {/* Search bar */}
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search foods..."
                  placeholderTextColor={Colors.textMuted}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  autoFocus
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                  <Text style={styles.searchBtnText}>{searching ? "..." : "Search"}</Text>
                </TouchableOpacity>
              </View>

              {searching && (
                <View style={styles.searchingWrap}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.searchingText}>Searching...</Text>
                </View>
              )}

              <FlatList
                data={searchResults}
                keyExtractor={(item, i) => `${item.name}-${i}`}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultRow} onPress={() => handleSelectFood(item)}>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
                      {item.brand && <Text style={styles.resultBrand}>{item.brand}</Text>}
                      <Text style={styles.resultMacros}>
                        {Math.round(item.calories)} kcal · P:{Math.round(item.protein)}g · C:{Math.round(item.carbs)}g · F:{Math.round(item.fat)}g
                      </Text>
                    </View>
                    <Text style={styles.resultArrow}>›</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  !searching && searchQuery.length > 0 ? (
                    <Text style={styles.noResults}>No results. Try a different search.</Text>
                  ) : null
                }
              />
            </>
          ) : (
            <ScrollView style={styles.addFoodForm}>
              <View style={styles.selectedFood}>
                <Text style={styles.selectedName}>{selectedFood.name}</Text>
                {selectedFood.brand && <Text style={styles.selectedBrand}>{selectedFood.brand}</Text>}
                <View style={styles.selectedMacros}>
                  <MacroChip label="Cal" value={selectedFood.calories} color={Colors.primary} />
                  <MacroChip label="Protein" value={selectedFood.protein} color={Colors.protein} />
                  <MacroChip label="Carbs" value={selectedFood.carbs} color={Colors.carbs} />
                  <MacroChip label="Fat" value={selectedFood.fat} color={Colors.fat} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Unit</Text>
              <View style={styles.unitRow}>
                {["serving", "g", "oz", "scoop", "cup"].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && styles.unitChipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.addFoodBtn, adding && styles.addFoodBtnDisabled]}
                onPress={handleAddFood}
                disabled={adding}
              >
                {adding ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.addFoodBtnText}>Add to {activeMeal}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedFood(null)}>
                <Text style={styles.backBtnText}>← Back to Search</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dateArrow: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  dateArrowDisabled: { opacity: 0.3 },
  dateArrowText: { fontSize: 28, color: Colors.primary, fontWeight: "300" },
  dateCenterWrap: { alignItems: "center" },
  dateText: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  dateSub: { fontSize: 12, color: Colors.textSecondary },
  totalsBar: { flexDirection: "row", backgroundColor: Colors.surface, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  totalItem: { flex: 1, alignItems: "center" },
  totalVal: { fontSize: 18, fontWeight: "bold" },
  totalLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  totalDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  mealSection: { backgroundColor: Colors.surface, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  mealCals: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  addBtn: { backgroundColor: "rgba(34,211,238,0.1)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary },
  addBtnText: { color: Colors.primary, fontSize: 13, fontWeight: "600" },
  emptyMeal: { padding: 16, alignItems: "center" },
  emptyMealText: { color: Colors.textMuted, fontSize: 13 },
  entryRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  entryMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  entryMacros: { flexDirection: "row", gap: 10, marginTop: 3 },
  entryMacro: { fontSize: 11, fontWeight: "600" },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(239,68,68,0.1)", justifyContent: "center", alignItems: "center" },
  deleteBtnText: { color: Colors.danger, fontSize: 12, fontWeight: "bold" },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.primary, marginTop: 4 },
  scanIcon: { fontSize: 28 },
  scanTitle: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  scanSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  searchRow: { flexDirection: "row", padding: 12, gap: 8 },
  searchInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  searchBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  searchBtnText: { color: "#0f172a", fontWeight: "700", fontSize: 14 },
  searchingWrap: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  searchingText: { color: Colors.textSecondary, fontSize: 14 },
  resultRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  resultBrand: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  resultMacros: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  resultArrow: { fontSize: 20, color: Colors.textMuted },
  noResults: { textAlign: "center", color: Colors.textMuted, padding: 24, fontSize: 14 },
  addFoodForm: { flex: 1, padding: 16 },
  selectedFood: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  selectedName: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  selectedBrand: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  selectedMacros: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  macroChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  macroChipVal: { fontSize: 15, fontWeight: "700" },
  macroChipLabel: { fontSize: 10, color: Colors.textMuted },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  amountInput: { backgroundColor: Colors.surface, borderRadius: 10, padding: 14, color: Colors.textPrimary, fontSize: 18, fontWeight: "700", borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  unitRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 24 },
  unitChip: { borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 8 },
  unitChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitChipText: { color: Colors.textSecondary, fontSize: 14 },
  unitChipTextActive: { color: "#0f172a", fontWeight: "700" },
  addFoodBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 12 },
  addFoodBtnDisabled: { opacity: 0.6 },
  addFoodBtnText: { color: "#0f172a", fontWeight: "bold", fontSize: 16 },
  backBtn: { alignItems: "center", padding: 12 },
  backBtnText: { color: Colors.textSecondary, fontSize: 14 },
});
