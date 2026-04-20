import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Modal, TextInput, ActivityIndicator,
  Alert, FlatList, KeyboardAvoidingView, Platform,
} from "react-native";
import { format, addDays, subDays } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import {
  apiGetFoodLog, apiAddFoodEntry, apiDeleteFoodEntry,
  apiSearchFood, apiScanBarcode,
} from "../../lib/api";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const UNITS = ["serving", "g", "oz", "scoop", "cup"];

// ─── Types ────────────────────────────────────────────────────────────────────
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
interface FoodResult {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
}
type AddMode = "picker" | "search" | "barcode" | "manual";

// ─── MacroChip ────────────────────────────────────────────────────────────────
function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.macroChip, { borderColor: color }]}>
      <Text style={[styles.macroChipVal, { color }]}>{Math.round(value)}</Text>
      <Text style={styles.macroChipLabel}>{label}</Text>
    </View>
  );
}

// ─── FoodEntryRow ─────────────────────────────────────────────────────────────
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
        <Ionicons name="close-circle" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

// ─── AddFoodSheet ─────────────────────────────────────────────────────────────
interface AddFoodSheetProps {
  visible: boolean;
  meal: string;
  date: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddFoodSheet({ visible, meal, date, onClose, onAdded }: AddFoodSheetProps) {
  const [mode, setMode] = useState<AddMode>("picker");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [adding, setAdding] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCals, setManualCals] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");

  function reset() {
    setMode("picker");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedFood(null);
    setAmount("1");
    setUnit("serving");
    setScanned(false);
    setScanLoading(false);
    setManualName("");
    setManualCals("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
  }

  function handleClose() {
    reset();
    onClose();
  }

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

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned || scanLoading) return;
    setScanned(true);
    setScanLoading(true);
    try {
      const result = await apiScanBarcode(data);
      if (result) {
        setSelectedFood({
          name: result.name || "Scanned Product",
          brand: result.brand,
          calories: result.calories ?? 0,
          protein: result.protein ?? 0,
          carbs: result.carbs ?? 0,
          fat: result.fat ?? 0,
          servingSize: result.servingSize,
        });
        setMode("search");
      } else {
        Alert.alert("Not Found", "Could not find nutrition info for this barcode.", [
          { text: "Try Again", onPress: () => { setScanned(false); setScanLoading(false); } },
          { text: "Enter Manually", onPress: () => setMode("manual") },
        ]);
      }
    } catch (e: any) {
      Alert.alert("Scan Error", e.message || "Could not look up barcode.", [
        { text: "Try Again", onPress: () => { setScanned(false); setScanLoading(false); } },
      ]);
    }
    setScanLoading(false);
  }

  async function handleAddFood(food: FoodResult) {
    setAdding(true);
    try {
      const multiplier = parseFloat(amount) || 1;
      await apiAddFoodEntry({
        name: food.name,
        calories: Math.round(food.calories * multiplier),
        protein: Math.round(food.protein * multiplier),
        carbs: Math.round(food.carbs * multiplier),
        fat: Math.round(food.fat * multiplier),
        meal,
        amount: multiplier,
        unit,
        date,
      });
      reset();
      onAdded();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not add food.");
    }
    setAdding(false);
  }

  async function handleManualAdd() {
    if (!manualName.trim() || !manualCals.trim()) {
      Alert.alert("Required", "Please enter at least a food name and calories.");
      return;
    }
    await handleAddFood({
      name: manualName.trim(),
      calories: parseFloat(manualCals) || 0,
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fat: parseFloat(manualFat) || 0,
    });
  }

  function renderConfirmCard(food: FoodResult) {
    return (
      <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
        <View style={styles.selectedCard}>
          <Text style={styles.selectedName}>{food.name}</Text>
          {food.brand ? <Text style={styles.selectedBrand}>{food.brand}</Text> : null}
          <View style={styles.selectedMacros}>
            <MacroChip label="kcal" value={food.calories} color={Colors.primary} />
            <MacroChip label="Protein" value={food.protein} color={Colors.protein} />
            <MacroChip label="Carbs" value={food.carbs} color={Colors.carbs} />
            <MacroChip label="Fat" value={food.fat} color={Colors.fat} />
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
          {UNITS.map((u) => (
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
          onPress={() => handleAddFood(food)}
          disabled={adding}
        >
          {adding
            ? <ActivityIndicator color="#0f172a" />
            : <Text style={styles.addFoodBtnText}>Add to {meal}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedFood(null); setMode("picker"); }}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderContent() {
    if (selectedFood) return renderConfirmCard(selectedFood);

    switch (mode) {
      case "picker":
        return (
          <View style={styles.pickerWrap}>
            <Text style={styles.pickerTitle}>Add to {meal}</Text>
            <Text style={styles.pickerSub}>How would you like to add food?</Text>
            <View style={styles.methodGrid}>
              <TouchableOpacity style={styles.methodCard} onPress={() => setMode("search")}>
                <View style={[styles.methodIcon, { backgroundColor: "rgba(6,182,212,0.15)" }]}>
                  <Ionicons name="search" size={26} color={Colors.primary} />
                </View>
                <Text style={styles.methodLabel}>Search Food</Text>
                <Text style={styles.methodSub}>Search our database</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.methodCard}
                onPress={async () => {
                  if (!cameraPermission?.granted) await requestCameraPermission();
                  setScanned(false);
                  setMode("barcode");
                }}
              >
                <View style={[styles.methodIcon, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                  <Ionicons name="barcode-outline" size={26} color="#f59e0b" />
                </View>
                <Text style={styles.methodLabel}>Scan Barcode</Text>
                <Text style={styles.methodSub}>Point camera at barcode</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.methodCard} onPress={() => setMode("manual")}>
                <View style={[styles.methodIcon, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                  <Ionicons name="create-outline" size={26} color="#10b981" />
                </View>
                <Text style={styles.methodLabel}>Enter Manually</Text>
                <Text style={styles.methodSub}>Type in macros</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.methodCard} onPress={() => Alert.alert("Coming Soon", "AI Scan will be available in a future update.")}>
                <View style={[styles.methodIcon, { backgroundColor: "rgba(139,92,246,0.15)" }]}>
                  <Ionicons name="sparkles" size={26} color="#8b5cf6" />
                </View>
                <Text style={styles.methodLabel}>AI Scan</Text>
                <Text style={styles.methodSub}>Scan nutrition label</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case "search":
        return (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultRow} onPress={() => setSelectedFood(item)}>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
                    {item.brand ? <Text style={styles.resultBrand}>{item.brand}</Text> : null}
                    <Text style={styles.resultMacros}>
                      {Math.round(item.calories)} kcal · P:{Math.round(item.protein)}g · C:{Math.round(item.carbs)}g · F:{Math.round(item.fat)}g
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !searching && searchQuery.length > 0
                  ? <Text style={styles.noResults}>No results. Try a different search or enter manually.</Text>
                  : null
              }
            />
          </KeyboardAvoidingView>
        );

      case "barcode":
        if (!cameraPermission?.granted) {
          return (
            <View style={styles.permissionWrap}>
              <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.permissionText}>Camera permission is required to scan barcodes.</Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
                <Text style={styles.permissionBtnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>
                {scanLoading ? "Looking up product..." : "Point at a barcode"}
              </Text>
              {scanLoading && <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />}
            </View>
          </View>
        );

      case "manual":
        return (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.manualTitle}>Enter Food Details</Text>
              <Text style={styles.fieldLabel}>Food Name *</Text>
              <TextInput
                style={styles.manualInput}
                value={manualName}
                onChangeText={setManualName}
                placeholder="e.g. Chicken Breast"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <Text style={styles.fieldLabel}>Calories *</Text>
              <TextInput
                style={styles.manualInput}
                value={manualCals}
                onChangeText={setManualCals}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Text style={[styles.fieldLabel, { color: Colors.protein }]}>Protein (g)</Text>
                  <TextInput
                    style={styles.manualInput}
                    value={manualProtein}
                    onChangeText={setManualProtein}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={[styles.fieldLabel, { color: Colors.carbs }]}>Carbs (g)</Text>
                  <TextInput
                    style={styles.manualInput}
                    value={manualCarbs}
                    onChangeText={setManualCarbs}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.macroField}>
                  <Text style={[styles.fieldLabel, { color: Colors.fat }]}>Fat (g)</Text>
                  <TextInput
                    style={styles.manualInput}
                    value={manualFat}
                    onChangeText={setManualFat}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                style={styles.manualInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="1"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.fieldLabel}>Unit</Text>
              <View style={styles.unitRow}>
                {UNITS.map((u) => (
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
                onPress={handleManualAdd}
                disabled={adding}
              >
                {adding
                  ? <ActivityIndicator color="#0f172a" />
                  : <Text style={styles.addFoodBtnText}>Add to {meal}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setMode("picker")}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        );
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add to {meal}</Text>
          {mode !== "picker" && !selectedFood ? (
            <TouchableOpacity onPress={() => { setSelectedFood(null); setMode("picker"); }}>
              <Ionicons name="apps-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
        {renderContent()}
      </View>
    </Modal>
  );
}

// ─── Main Food Screen ─────────────────────────────────────────────────────────
export default function FoodScreen() {
  const [date, setDate] = useState(new Date());
  const [foodLog, setFoodLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeMeal, setActiveMeal] = useState("Breakfast");

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
  const getMealEntries = (meal: string) => entries.filter((e) => e.meal?.toLowerCase() === meal.toLowerCase());
  const getMealCals = (meal: string) => Math.round(getMealEntries(meal).reduce((s, e) => s + (e.calories ?? 0), 0));
  const totalCals = Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0));
  const totalProtein = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat ?? 0), 0);

  function openAdd(meal: string) {
    setActiveMeal(meal);
    setShowAddSheet(true);
  }

  async function handleDelete(id: number) {
    Alert.alert("Remove Food", "Remove this food entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try { await apiDeleteFoodEntry(id); await loadLog(); }
          catch { Alert.alert("Error", "Could not remove entry."); }
        },
      },
    ]);
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
                  <TouchableOpacity style={styles.addBtn} onPress={() => openAdd(meal)}>
                    <Ionicons name="add" size={16} color={Colors.primary} />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {mealEntries.length === 0 ? (
                  <TouchableOpacity style={styles.emptyMeal} onPress={() => openAdd(meal)}>
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
        </ScrollView>
      )}

      <AddFoodSheet
        visible={showAddSheet}
        meal={activeMeal}
        date={dateStr}
        onClose={() => setShowAddSheet(false)}
        onAdded={() => { setShowAddSheet(false); loadLog(); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 32 },

  // Date nav
  dateNav: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dateArrow: { padding: 14 },
  dateArrowDisabled: { opacity: 0.3 },
  dateArrowText: { fontSize: 28, color: Colors.primary, fontWeight: "300" },
  dateCenterWrap: { flex: 1, alignItems: "center", paddingVertical: 10 },
  dateText: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  dateSub: { fontSize: 12, color: Colors.textSecondary },

  // Totals bar
  totalsBar: { flexDirection: "row", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10 },
  totalItem: { flex: 1, alignItems: "center" },
  totalVal: { fontSize: 17, fontWeight: "800" },
  totalLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  totalDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // Meal sections
  mealSection: { backgroundColor: Colors.surface, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  mealCals: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(34,211,238,0.1)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary },
  addBtnText: { color: Colors.primary, fontSize: 13, fontWeight: "600" },
  emptyMeal: { padding: 16, alignItems: "center" },
  emptyMealText: { color: Colors.textMuted, fontSize: 13 },

  // Food entry row
  entryRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  entryMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  entryMacros: { flexDirection: "row", gap: 10, marginTop: 3 },
  entryMacro: { fontSize: 11, fontWeight: "600" },
  deleteBtn: { padding: 4 },

  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },

  // Method picker
  pickerWrap: { flex: 1, padding: 20 },
  pickerTitle: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary, textAlign: "center", marginBottom: 4 },
  pickerSub: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginBottom: 24 },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  methodCard: { width: "47%", backgroundColor: Colors.surface, borderRadius: 16, padding: 18, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  methodIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  methodLabel: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  methodSub: { fontSize: 11, color: Colors.textMuted, textAlign: "center", marginTop: 3 },

  // Search
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
  noResults: { textAlign: "center", color: Colors.textMuted, padding: 24, fontSize: 14 },

  // Barcode scanner
  cameraWrap: { flex: 1, position: "relative" },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  scanFrame: { width: 240, height: 160, borderWidth: 2, borderColor: "#06b6d4", borderRadius: 12, backgroundColor: "transparent" },
  scanHint: { color: "#fff", fontSize: 15, fontWeight: "600", marginTop: 20, textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  // Permission
  permissionWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  permissionText: { color: Colors.textSecondary, fontSize: 15, textAlign: "center" },
  permissionBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  permissionBtnText: { color: "#0f172a", fontWeight: "700", fontSize: 15 },

  // Confirm card
  selectedCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  selectedName: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  selectedBrand: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  selectedMacros: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  macroChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  macroChipVal: { fontSize: 15, fontWeight: "700" },
  macroChipLabel: { fontSize: 10, color: Colors.textMuted },

  // Manual entry
  manualTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 16 },
  manualInput: { backgroundColor: Colors.surface, borderRadius: 10, padding: 14, color: Colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  macroRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  macroField: { flex: 1 },

  // Shared form
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
