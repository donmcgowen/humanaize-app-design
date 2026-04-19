import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { format } from "date-fns";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../lib/AuthContext";
import { apiGetFoodLog, apiGetProfile } from "../../lib/api";
import Svg, { Circle } from "react-native-svg";

const RING_SIZE = 180;
const STROKE = 14;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const pct = Math.min(consumed / Math.max(target, 1), 1);
  const dash = pct * CIRCUMFERENCE;
  const over = consumed > target;
  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke={Colors.border} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={over ? Colors.danger : Colors.primary}
          strokeWidth={STROKE} fill="none"
          strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringCalories, over && { color: Colors.danger }]}>{consumed.toLocaleString()}</Text>
        <Text style={styles.ringLabel}>of {target.toLocaleString()} kcal</Text>
        <Text style={[styles.ringRemaining, over && { color: Colors.danger }]}>
          {over ? `${(consumed - target).toLocaleString()} over` : `${Math.max(target - consumed, 0).toLocaleString()} left`}
        </Text>
      </View>
    </View>
  );
}

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min(current / Math.max(target, 1), 1);
  return (
    <View style={styles.macroBarWrap}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={[styles.macroBarValue, { color }]}>{Math.round(current)}g <Text style={styles.macroBarTarget}>/ {target}g</Text></Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MealCard({ meal, calories, items }: { meal: string; calories: number; items: number }) {
  return (
    <TouchableOpacity style={styles.mealCard} onPress={() => router.push("/(tabs)/food")}>
      <View>
        <Text style={styles.mealName}>{meal}</Text>
        <Text style={styles.mealItems}>{items > 0 ? `${items} item${items !== 1 ? "s" : ""}` : "Nothing logged"}</Text>
      </View>
      <Text style={[styles.mealCals, { color: items > 0 ? Colors.primary : Colors.textMuted }]}>
        {calories > 0 ? `${calories} kcal` : "—"}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [foodLog, setFoodLog] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const displayDate = format(new Date(), "EEEE, MMMM d");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  async function loadData() {
    try {
      const [log, prof] = await Promise.all([
        apiGetFoodLog(today).catch(() => null),
        apiGetProfile().catch(() => null),
      ]);
      setFoodLog(log);
      setProfile(prof);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const entries = foodLog?.entries ?? [];
  const totalCals = Math.round(entries.reduce((s: number, e: any) => s + (e.calories ?? 0), 0));
  const totalProtein = entries.reduce((s: number, e: any) => s + (e.protein ?? 0), 0);
  const totalCarbs = entries.reduce((s: number, e: any) => s + (e.carbs ?? 0), 0);
  const totalFat = entries.reduce((s: number, e: any) => s + (e.fat ?? 0), 0);

  const targetCals = profile?.dailyCalorieTarget ?? 0;
  const targetProtein = profile?.proteinTarget ?? 0;
  const targetCarbs = profile?.carbTarget ?? 0;
  const targetFat = profile?.fatTarget ?? 0;

  const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];
  function getMealData(meal: string) {
    const mealEntries = entries.filter((e: any) => e.meal?.toLowerCase() === meal.toLowerCase());
    return {
      calories: Math.round(mealEntries.reduce((s: number, e: any) => s + (e.calories ?? 0), 0)),
      items: mealEntries.length,
    };
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋</Text>
          <Text style={styles.date}>{displayDate}</Text>
        </View>
        <TouchableOpacity style={styles.aiBtn}>
          <Text style={styles.aiBtnText}>✨ AI</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Calories</Text>
            <CalorieRing consumed={totalCals} target={targetCals} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Macros</Text>
            <MacroBar label="Protein" current={totalProtein} target={targetProtein} color={Colors.protein} />
            <MacroBar label="Carbs" current={totalCarbs} target={targetCarbs} color={Colors.carbs} />
            <MacroBar label="Fat" current={totalFat} target={targetFat} color={Colors.fat} />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Meals</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/food")}>
                <Text style={styles.seeAll}>+ Add Food</Text>
              </TouchableOpacity>
            </View>
            {meals.map((meal) => {
              const d = getMealData(meal);
              return <MealCard key={meal} meal={meal} calories={d.calories} items={d.items} />;
            })}
          </View>

          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/food")}>
              <Text style={styles.quickIcon}>📷</Text>
              <Text style={styles.quickLabel}>Scan Food</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/workouts")}>
              <Text style={styles.quickIcon}>🏋️</Text>
              <Text style={styles.quickLabel}>Log Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/monitoring")}>
              <Text style={styles.quickIcon}>⚖️</Text>
              <Text style={styles.quickLabel}>Log Weight</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.aiCard}>
            <Text style={styles.aiCardTitle}>✨ AI Insight</Text>
            <Text style={styles.aiCardText}>
              {totalCals === 0
                ? "Start logging your meals to get personalized AI insights and recommendations."
                : totalProtein < targetProtein * 0.5
                ? `You're at ${Math.round(totalProtein)}g protein — aim for ${targetProtein}g today. Consider adding a protein-rich meal or shake.`
                : totalCals > targetCals * 0.9
                ? `You're close to your ${targetCals} kcal goal. Make your remaining meals light and protein-focused.`
                : `Great progress! ${totalCals} kcal consumed with ${Math.round(totalProtein)}g protein. Keep it up!`}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: "bold", color: Colors.textPrimary },
  date: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  aiBtn: { backgroundColor: "rgba(139,92,246,0.2)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: Colors.secondary },
  aiBtnText: { color: Colors.secondary, fontWeight: "700", fontSize: 13 },
  loadingWrap: { paddingTop: 80, alignItems: "center" },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 14 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: "600" },
  ringContainer: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  ringCenter: { position: "absolute", alignItems: "center" },
  ringCalories: { fontSize: 38, fontWeight: "bold", color: Colors.primary },
  ringLabel: { fontSize: 12, color: Colors.textSecondary },
  ringRemaining: { fontSize: 13, color: Colors.success, fontWeight: "600", marginTop: 2 },
  macroBarWrap: { marginBottom: 12 },
  macroBarHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  macroBarLabel: { fontSize: 13, color: Colors.textSecondary },
  macroBarValue: { fontSize: 13, fontWeight: "700" },
  macroBarTarget: { fontWeight: "normal", color: Colors.textMuted },
  macroBarTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  macroBarFill: { height: 6, borderRadius: 3 },
  mealCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  mealName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  mealItems: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  mealCals: { fontSize: 14, fontWeight: "700" },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  quickIcon: { fontSize: 26, marginBottom: 6 },
  quickLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600", textAlign: "center" },
  aiCard: { backgroundColor: "#1a1040", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#4c1d95" },
  aiCardTitle: { fontSize: 14, fontWeight: "700", color: "#a78bfa", marginBottom: 8 },
  aiCardText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
