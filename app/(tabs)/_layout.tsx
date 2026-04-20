import { Tabs, useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useState } from "react";

const C = {
  bg: "#0f172a",
  tabBg: "#1e293b",
  border: "#334155",
  active: "#06b6d4",
  inactive: "#64748b",
  aiBtn: "#8b5cf6",
  drawerBg: "#1e293b",
  drawerText: "#f1f5f9",
};

const DRAWER_WIDTH = Dimensions.get("window").width * 0.72;

const NAV_ITEMS = [
  { label: "Dashboard", icon: "flash-outline" as const, activeIcon: "flash" as const, route: "/(tabs)/dashboard" },
  { label: "Food Log", icon: "nutrition-outline" as const, activeIcon: "nutrition" as const, route: "/(tabs)/food" },
  { label: "Workouts", icon: "barbell-outline" as const, activeIcon: "barbell" as const, route: "/(tabs)/workouts" },
  { label: "Monitoring", icon: "stats-chart-outline" as const, activeIcon: "stats-chart" as const, route: "/(tabs)/monitoring" },
  { label: "Profile", icon: "person-outline" as const, activeIcon: "person" as const, route: "/(tabs)/profile" },
];

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? C.active : C.inactive} />
    </View>
  );
}

// Slide-out drawer component
function DrawerMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate open/close
  if (visible) {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(fadeAnim, { toValue: 0.5, duration: 200, useNativeDriver: true }),
    ]).start();
  } else {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <Animated.View style={[styles.drawerBackdrop, { opacity: fadeAnim }]} />
      </Pressable>

      {/* Drawer panel */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* Drawer header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>HumanAIze</Text>
          <Text style={styles.drawerSubtitle}>AI-Powered Health Intelligence</Text>
        </View>

        {/* Nav items */}
        <View style={styles.drawerNav}>
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.drawerItem}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                setTimeout(() => router.push(item.route as any), 150);
              }}
            >
              <View style={styles.drawerItemIcon}>
                <Ionicons name={item.activeIcon} size={20} color={C.active} />
              </View>
              <Text style={styles.drawerItemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.inactive} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.drawerDivider} />

        {/* Quick actions */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => { onClose(); setTimeout(() => router.push("/scan" as any), 150); }}
        >
          <View style={styles.drawerItemIcon}>
            <Ionicons name="barcode-outline" size={20} color="#f59e0b" />
          </View>
          <Text style={styles.drawerItemLabel}>Scan Barcode</Text>
          <Ionicons name="chevron-forward" size={16} color={C.inactive} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => { onClose(); setTimeout(() => router.push("/assistant" as any), 150); }}
        >
          <View style={styles.drawerItemIcon}>
            <Ionicons name="sparkles" size={20} color="#8b5cf6" />
          </View>
          <Text style={styles.drawerItemLabel}>AI Assistant</Text>
          <Ionicons name="chevron-forward" size={16} color={C.inactive} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// Header left — tappable HumanAIze logo that opens drawer
function HeaderLeft({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity onPress={onOpen} style={styles.headerLogoBtn} activeOpacity={0.7}>
      <Text style={styles.headerLogoText}>HumanAIze</Text>
      <Ionicons name="menu" size={18} color={C.active} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Extra bottom padding so tab bar clears Android gesture bar
  const tabBarHeight = Platform.OS === "ios" ? 60 : 58;
  const tabBarPaddingBottom = Platform.OS === "ios" ? insets.bottom : Math.max(insets.bottom, 8);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: C.tabBg,
            borderTopColor: C.border,
            borderTopWidth: 1,
            height: tabBarHeight + tabBarPaddingBottom,
            paddingBottom: tabBarPaddingBottom,
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
          headerTitleStyle: { display: "none" }, // hide default title — we use custom left
          headerShadowVisible: false,
          headerLeft: () => <HeaderLeft onOpen={() => setDrawerOpen(true)} />,
          headerRight: () => {
            const router = useRouter();
            return (
              <View style={{ flexDirection: "row", gap: 4, marginRight: 8 }}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/scan" as any)}>
                  <Ionicons name="barcode-outline" size={22} color="#f1f5f9" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/assistant" as any)}>
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
            tabBarLabel: "Home",
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? "flash" : "flash-outline"} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="food"
          options={{
            tabBarLabel: "Food",
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? "nutrition" : "nutrition-outline"} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="workouts"
          options={{
            tabBarLabel: "Workouts",
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? "barbell" : "barbell-outline"} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="monitoring"
          options={{
            tabBarLabel: "Monitor",
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? "stats-chart" : "stats-chart-outline"} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? "person" : "person-outline"} focused={focused} />,
          }}
        />
      </Tabs>

      {/* Drawer overlay — rendered above tabs */}
      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
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
  headerLogoBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    paddingVertical: 6,
    paddingRight: 8,
  },
  headerLogoText: {
    color: C.active,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 10,
  },
  // Drawer styles
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: C.drawerBg,
    borderRightWidth: 1,
    borderRightColor: "#334155",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    marginBottom: 8,
  },
  drawerTitle: {
    color: C.active,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  drawerSubtitle: {
    color: C.inactive,
    fontSize: 12,
    marginTop: 2,
  },
  drawerNav: {
    paddingTop: 8,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(6,182,212,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerItemLabel: {
    flex: 1,
    color: C.drawerText,
    fontSize: 15,
    fontWeight: "600",
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#334155",
    marginHorizontal: 20,
    marginVertical: 8,
  },
});
