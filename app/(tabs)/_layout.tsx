import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.iconEmoji, { opacity: focused ? 1 : 0.5 }]}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.tabBackground,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: -2 },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: "bold", color: Colors.primary, fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "HumanAIze", tabBarLabel: "Home", tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" focused={focused} /> }} />
      <Tabs.Screen name="food" options={{ title: "Food Log", tabBarLabel: "Food", tabBarIcon: ({ focused }) => <TabIcon emoji="🍎" focused={focused} /> }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts", tabBarLabel: "Workouts", tabBarIcon: ({ focused }) => <TabIcon emoji="🏋️" focused={focused} /> }} />
      <Tabs.Screen name="monitoring" options={{ title: "Monitoring", tabBarLabel: "Monitor", tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  iconWrapActive: { backgroundColor: "rgba(34,211,238,0.12)" },
  iconEmoji: { fontSize: 20 },
});
