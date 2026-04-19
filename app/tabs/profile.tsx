import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { logout } from "../../lib/auth";

function SettingsRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress}>
      <Text style={styles.settingsLabel}>{label}</Text>
      {value && <Text style={styles.settingsValue}>{value} →</Text>}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out", style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.username}>Username</Text>
        <Text style={styles.email}>user@email.com</Text>
      </View>

      {/* Profile settings */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <SettingsRow label="Goal" value="Lose Weight" />
        <SettingsRow label="Daily Calorie Target" value="2,000 kcal" />
        <SettingsRow label="Protein Target" value="150g" />
        <SettingsRow label="Activity Level" value="Moderate" />
      </View>

      <Text style={styles.sectionTitle}>Health</Text>
      <View style={styles.card}>
        <SettingsRow label="Health Conditions" value="None" />
        <SettingsRow label="Connected Sources" value="None" />
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <SettingsRow label="Edit Profile" />
        <SettingsRow label="Change Password" />
        <SettingsRow label="Notifications" />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>HumanAIze v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: "center", marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface,
    justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: Colors.primary,
  },
  avatarText: { fontSize: 36 },
  username: { fontSize: 20, fontWeight: "bold", color: Colors.textPrimary, marginTop: 10 },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textMuted, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  settingsLabel: { fontSize: 15, color: Colors.textPrimary },
  settingsValue: { fontSize: 14, color: Colors.textSecondary },
  logoutBtn: {
    backgroundColor: "#1e0a0a", borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 24, borderWidth: 1, borderColor: "#7f1d1d",
  },
  logoutText: { color: Colors.danger, fontWeight: "bold", fontSize: 16 },
  version: { textAlign: "center", color: Colors.textMuted, fontSize: 12, marginTop: 20 },
});
