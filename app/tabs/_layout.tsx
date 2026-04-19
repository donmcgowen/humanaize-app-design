import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";

// Simple icon text placeholders — replace with react-native-vector-icons or expo/vector-icons
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "⚡",
    Food: "🍎",
    Workouts: "🏋️",
    Monitoring: "📊",
    Profile: "👤",
  };
  return null; // Icons handled by tabBarIcon below
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.tabBackground,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: "bold", color: Colors.primary },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <TabBarEmoji emoji="⚡" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: "Food Log",
          tabBarLabel: "Food",
          tabBarIcon: ({ color, size }) => (
            <TabBarEmoji emoji="🍎" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarLabel: "Workouts",
          tabBarIcon: ({ color, size }) => (
            <TabBarEmoji emoji="🏋️" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="monitoring"
        options={{
          title: "Monitoring",
          tabBarLabel: "Monitor",
          tabBarIcon: ({ color, size }) => (
            <TabBarEmoji emoji="📊" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabBarEmoji emoji="👤" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple emoji tab icon component
import { Text } from "react-native";
function TabBarEmoji({ emoji, color, size }: { emoji: string; color: string; size: number }) {
  return <Text style={{ fontSize: size - 4, opacity: color === Colors.tabActive ? 1 : 0.5 }}>{emoji}</Text>;
}
