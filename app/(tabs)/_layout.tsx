import { Tabs, useRouter } from "expo-router";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const C = {
  bg: "#0f172a",
  tabBg: "#1e293b",
  border: "#334155",
  active: "#06b6d4",
  inactive: "#64748b",
  aiBtn: "#8b5cf6",
};

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? C.active : C.inactive} />
    </View>
  );
}

// Floating AI assistant button in the center of the tab bar
function AIButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.aiButton}
      onPress={() => router.push("/assistant")}
      activeOpacity={0.85}
    >
      <View style={styles.aiButtonInner}>
        <Ionicons name="sparkles" size={24} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: C.tabBg,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.active,
        tabBarInactiveTintColor: C.inactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
        },
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: "#f1f5f9",
        headerTitleStyle: {
          fontWeight: "800",
          color: C.active,
          fontSize: 18,
          letterSpacing: 0.5,
        },
        headerShadowVisible: false,
        headerRight: () => {
          const router = useRouter();
          return (
            <View style={{ flexDirection: "row", gap: 4, marginRight: 8 }}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => router.push("/scan")}
              >
                <Ionicons name="barcode-outline" size={22} color="#f1f5f9" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => router.push("/assistant")}
              >
                <Ionicons name="sparkles-outline" size={22} color={C.aiBtn} />
              </TouchableOpacity>
            </View>
          );
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "HumanAIze",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "flash" : "flash-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: "Food Log",
          tabBarLabel: "Food",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "nutrition" : "nutrition-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarLabel: "Workouts",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "barbell" : "barbell-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="monitoring"
        options={{
          title: "Monitoring",
          tabBarLabel: "Monitor",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "stats-chart" : "stats-chart-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapActive: {
    backgroundColor: "rgba(6,182,212,0.12)",
  },
  aiButton: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 20 : 8,
    alignSelf: "center",
  },
  aiButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 10,
  },
});
