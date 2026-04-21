/**
 * scan.tsx — Barcode Scanner + AI Food Camera
 *
 * Flow:
 * 1. Camera opens in barcode-scan mode
 * 2. If barcode detected → auto-lookup macros → show result card
 * 3. If no barcode → AI mode button → capture frame → Gemini analyses nutrition label / food
 * 4. User edits macros → selects meal → Add Food
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Vibration,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiScanBarcode, apiAddFoodEntry, apiAIScanFood } from "../lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  accent: "#06b6d4",
  accentGreen: "#10b981",
  accentPurple: "#8b5cf6",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  danger: "#ef4444",
  warning: "#f59e0b",
};

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

interface MacroResult {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  servingUnit?: string;
  amount?: number;
  source: "barcode" | "ai" | "manual";
}

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const [permission, requestPermission] = useCameraPermissions();

  // Camera state
  const [mode, setMode] = useState<"barcode" | "ai">("barcode");
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Result state
  const [result, setResult] = useState<MacroResult | null>(null);
  const [editedResult, setEditedResult] = useState<MacroResult | null>(null);
  const [selectedMeal, setSelectedMeal] = useState(params.meal ?? "Breakfast");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [adding, setAdding] = useState(false);

  // AI capture state
  const cameraRef = useRef<CameraView>(null);
  const lastScannedRef = useRef<string | null>(null);
  const scanCooldownRef = useRef(false);

  // ── Permissions ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // ── Barcode Scan ───────────────────────────────────────────────────────────

  const handleBarcodeScan = useCallback(
    async (scanResult: BarcodeScanningResult) => {
      if (!scanning || scanCooldownRef.current || processing) return;
      const barcode = scanResult.data;
      if (barcode === lastScannedRef.current) return;

      scanCooldownRef.current = true;
      lastScannedRef.current = barcode;
      setScanning(false);
      setProcessing(true);
      Vibration.vibrate(100);

      try {
        const data = await apiScanBarcode(barcode);
        if (data?.name) {
          // Determine best default unit from serving size string
          const servingStr = (data.servingSize ?? "").toLowerCase();
          let defaultUnit = data.servingUnit ?? "serving";
          if (!data.servingUnit) {
            if (servingStr.includes("scoop")) defaultUnit = "scoop";
            else if (servingStr.includes(" oz") || servingStr.includes("fl oz")) defaultUnit = "oz";
            else if (servingStr.includes(" g") || servingStr.includes("gram")) defaultUnit = "g";
            else if (servingStr.includes("cup")) defaultUnit = "cup";
          }
          const r: MacroResult = {
            name: data.name,
            brand: data.brand,
            calories: Math.round(data.calories ?? 0),
            protein: parseFloat((data.protein ?? 0).toFixed(1)),
            carbs: parseFloat((data.carbs ?? 0).toFixed(1)),
            fat: parseFloat((data.fat ?? 0).toFixed(1)),
            servingSize: data.servingSize,
            servingUnit: defaultUnit,
            amount: data.amount ?? 1,
            source: "barcode",
          };
          setResult(r);
          setEditedResult({ ...r });
          setAmount(String(r.amount ?? 1));
          setUnit(defaultUnit);
        } else {
          Alert.alert(
            "Product Not Found",
            "This barcode wasn't found in our database. Switch to AI mode to scan the nutrition label.",
            [
              { text: "Try AI Scan", onPress: () => switchToAI() },
              { text: "Cancel", onPress: resetScan },
            ]
          );
        }
      } catch (err: any) {
        Alert.alert("Scan Error", err.message ?? "Could not look up barcode.", [
          { text: "Try AI Scan", onPress: () => switchToAI() },
          { text: "Cancel", onPress: resetScan },
        ]);
      } finally {
        setProcessing(false);
        setTimeout(() => {
          scanCooldownRef.current = false;
        }, 2000);
      }
    },
    [scanning, processing]
  );

  // ── AI Capture ─────────────────────────────────────────────────────────────

  const switchToAI = () => {
    setMode("ai");
    setScanning(false);
    setResult(null);
    setEditedResult(null);
    lastScannedRef.current = null;
    scanCooldownRef.current = false;
  };

  const handleAICapture = async () => {
    if (!cameraRef.current || processing) return;
    setProcessing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        skipProcessing: true,
      });

      if (!photo?.base64) throw new Error("Failed to capture image");

      // Use "product" mode for scanning nutrition/supplement labels
      const scanData = await apiAIScanFood(photo.base64, "product");

      // analyzeMealPhoto returns { items, totals, mealName, description }
      // Flatten: use totals if single-item, or sum all items
      let name = "AI Detected Food";
      let calories = 0, protein = 0, carbs = 0, fat = 0;

      if (scanData?.items && scanData.items.length > 0) {
        // Use the first item's name as the food name; sum macros across all items
        name = scanData.mealName || scanData.items[0]?.name || name;
        const totals = scanData.totals ?? scanData.items.reduce(
          (acc: any, item: any) => ({
            calories: acc.calories + (Number(item.calories) || 0),
            protein:  acc.protein  + (Number(item.protein)  || 0),
            carbs:    acc.carbs    + (Number(item.carbs)    || 0),
            fat:      acc.fat      + (Number(item.fat)      || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        calories = Number(totals.calories) || 0;
        protein  = Number(totals.protein)  || 0;
        carbs    = Number(totals.carbs)    || 0;
        fat      = Number(totals.fat)      || 0;
      } else if (scanData?.name) {
        // Flat response shape fallback
        name     = scanData.name;
        calories = Number(scanData.calories) || 0;
        protein  = Number(scanData.protein)  || 0;
        carbs    = Number(scanData.carbs)    || 0;
        fat      = Number(scanData.fat)      || 0;
      } else {
        Alert.alert(
          "Nothing Detected",
          "Gemini couldn't detect food or a nutrition label. Try getting closer or better lighting.",
          [{ text: "Try Again", onPress: () => setProcessing(false) }]
        );
        return;
      }

      const r: MacroResult = {
        name,
        calories: Math.round(calories),
        protein:  parseFloat(protein.toFixed(1)),
        carbs:    parseFloat(carbs.toFixed(1)),
        fat:      parseFloat(fat.toFixed(1)),
        servingUnit: "serving",
        amount: 1,
        source: "ai",
      };
      setResult(r);
      setEditedResult({ ...r });
      setAmount("1");
      setUnit("serving");
    } catch (err: any) {
      Alert.alert("AI Error", err.message ?? "Could not analyse image.");
    } finally {
      setProcessing(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetScan = () => {
    setResult(null);
    setEditedResult(null);
    setScanning(true);
    setMode("barcode");
    lastScannedRef.current = null;
    scanCooldownRef.current = false;
  };

  // ── Add Food ───────────────────────────────────────────────────────────────

  const handleAddFood = async () => {
    if (!editedResult) return;
    setAdding(true);
    try {
      const multiplier = parseFloat(amount) || 1;
      await apiAddFoodEntry({
        date: params.date ?? new Date().toISOString().split("T")[0],
        meal: selectedMeal,
        name: editedResult.name,
        calories: Math.round(editedResult.calories * multiplier),
        protein: parseFloat((editedResult.protein * multiplier).toFixed(1)),
        carbs: parseFloat((editedResult.carbs * multiplier).toFixed(1)),
        fat: parseFloat((editedResult.fat * multiplier).toFixed(1)),
        servingSize: `${amount} ${unit}`,
        servingUnit: unit,
        amount: multiplier,
      });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not add food.");
    } finally {
      setAdding(false);
    }
  };

  // ── Render: Permission ─────────────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>
          HumanAIze needs camera access to scan barcodes and nutrition labels.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: COLORS.textMuted }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: Result Card ────────────────────────────────────────────────────

  if (result && editedResult) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.resultContainer}>
          {/* Header */}
          <View style={styles.resultHeader}>
            <TouchableOpacity onPress={resetScan} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.resultTitle}>
              {result.source === "barcode" ? "Barcode Result" : "AI Detected"}
            </Text>
            <View style={styles.sourceTag}>
              <Ionicons
                name={result.source === "barcode" ? "barcode-outline" : "sparkles-outline"}
                size={14}
                color={result.source === "barcode" ? COLORS.accentGreen : COLORS.accentPurple}
              />
              <Text
                style={[
                  styles.sourceTagText,
                  {
                    color:
                      result.source === "barcode" ? COLORS.accentGreen : COLORS.accentPurple,
                  },
                ]}
              >
                {result.source === "barcode" ? "Barcode" : "AI Scan"}
              </Text>
            </View>
          </View>

          {/* Food Name */}
          <View style={styles.card}>
            <Text style={styles.foodName}>{editedResult.name}</Text>
            {editedResult.brand ? (
              <Text style={styles.foodBrand}>{editedResult.brand}</Text>
            ) : null}

            {/* Amount & Unit */}
            <View style={styles.servingRow}>
              <View style={styles.servingField}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
              <View style={[styles.servingField, { flex: 2 }]}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={unit}
                  onChangeText={setUnit}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Macros */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nutrition (editable)</Text>
            <View style={styles.macroGrid}>
              {(
                [
                  { key: "calories", label: "Calories", color: COLORS.warning, unit: "" },
                  { key: "protein", label: "Protein", color: "#3b82f6", unit: "g" },
                  { key: "carbs", label: "Carbs", color: COLORS.accentGreen, unit: "g" },
                  { key: "fat", label: "Fat", color: "#f97316", unit: "g" },
                ] as const
              ).map(({ key, label, color, unit: u }) => (
                <View key={key} style={styles.macroCell}>
                  <Text style={[styles.macroLabel, { color }]}>{label}</Text>
                  <TextInput
                    style={[styles.macroInput, { borderColor: color + "44" }]}
                    value={String(editedResult[key])}
                    onChangeText={(v) =>
                      setEditedResult((prev) =>
                        prev ? { ...prev, [key]: parseFloat(v) || 0 } : prev
                      )
                    }
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.macroUnit}>{u}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Meal Selector */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add to Meal</Text>
            <View style={styles.mealRow}>
              {MEALS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealChip, selectedMeal === m && styles.mealChipActive]}
                  onPress={() => setSelectedMeal(m)}
                >
                  <Text
                    style={[
                      styles.mealChipText,
                      selectedMeal === m && styles.mealChipTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[styles.addBtn, adding && { opacity: 0.6 }]}
            onPress={handleAddFood}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add to {selectedMeal}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.rescanBtn} onPress={resetScan}>
            <Ionicons name="scan-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.rescanText}>Scan Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Render: Camera ─────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={
          mode === "barcode"
            ? {
                barcodeTypes: [
                  "ean13",
                  "ean8",
                  "upc_a",
                  "upc_e",
                  "code128",
                  "code39",
                  "qr",
                ],
              }
            : undefined
        }
        onBarcodeScanned={mode === "barcode" && scanning ? handleBarcodeScan : undefined}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.cameraTitle}>
          {mode === "barcode" ? "Scan Barcode" : "AI Food Scan"}
        </Text>
        <TouchableOpacity onPress={() => setTorch((t) => !t)} style={styles.iconBtn}>
          <Ionicons name={torch ? "flash" : "flash-outline"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Scan frame overlay */}
      {mode === "barcode" && (
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanHint}>
            Point at a barcode — it will scan automatically
          </Text>
        </View>
      )}

      {/* AI mode viewfinder hint */}
      {mode === "ai" && (
        <View style={styles.aiHintContainer}>
          <View style={styles.aiFrame} />
          <Text style={styles.scanHint}>
            Point at a nutrition label, food box, or meal
          </Text>
        </View>
      )}

      {/* Processing overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.processingText}>
            {mode === "barcode" ? "Looking up product..." : "Analysing with Gemini AI..."}
          </Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "barcode" && styles.modeBtnActive]}
            onPress={() => {
              setMode("barcode");
              setScanning(true);
              lastScannedRef.current = null;
              scanCooldownRef.current = false;
            }}
          >
            <Ionicons
              name="barcode-outline"
              size={20}
              color={mode === "barcode" ? "#fff" : COLORS.textMuted}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === "barcode" && styles.modeBtnTextActive,
              ]}
            >
              Barcode
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "ai" && styles.modeBtnActive]}
            onPress={switchToAI}
          >
            <Ionicons
              name="sparkles-outline"
              size={20}
              color={mode === "ai" ? "#fff" : COLORS.textMuted}
            />
            <Text
              style={[styles.modeBtnText, mode === "ai" && styles.modeBtnTextActive]}
            >
              AI Scan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Capture button (AI mode only) */}
        {mode === "ai" && (
          <TouchableOpacity
            style={[styles.captureBtn, processing && { opacity: 0.5 }]}
            onPress={handleAICapture}
            disabled={processing}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        )}

        {mode === "barcode" && (
          <Text style={styles.autoScanText}>Auto-scanning...</Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  permSub: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Camera UI
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iconBtn: { padding: 8 },
  cameraTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  scanFrameContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: SCREEN_W * 0.75,
    height: 140,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: COLORS.accentGreen,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 32,
  },
  aiHintContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  aiFrame: {
    width: SCREEN_W * 0.85,
    height: SCREEN_W * 0.85 * 0.65,
    borderWidth: 2,
    borderColor: COLORS.accentPurple,
    borderRadius: 16,
    borderStyle: "dashed",
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  processingText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    gap: 16,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 4,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: COLORS.accent },
  modeBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "600" },
  modeBtnTextActive: { color: "#fff" },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },
  autoScanText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },

  // Result card
  resultContainer: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  backBtn: { padding: 4 },
  resultTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", flex: 1 },
  sourceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sourceTagText: { fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  foodName: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  foodBrand: { color: COLORS.textMuted, fontSize: 13 },
  servingRow: { flexDirection: "row", gap: 12 },
  servingField: { flex: 1, gap: 4 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  fieldInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  macroCell: { width: "47%", gap: 4 },
  macroLabel: { fontSize: 12, fontWeight: "700" },
  macroInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  macroUnit: { color: COLORS.textMuted, fontSize: 11 },
  mealRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mealChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  mealChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  mealChipTextActive: { color: "#fff" },
  addBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
  },
  rescanText: { color: COLORS.textMuted, fontSize: 14 },
});
