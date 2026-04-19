import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { signup } from "../../lib/auth";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    setLoading(true);
    const result = await signup({ username: username.trim(), email: email.trim(), password, name: name.trim() || undefined });
    setLoading(false);
    if (result.success) {
      router.replace("/(tabs)/dashboard");
    } else {
      Alert.alert("Signup Failed", result.message || "Could not create account.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>HumanAIze</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name (optional)</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder="Your name" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.label}>Username *</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername}
            placeholder="Choose a username" placeholderTextColor={Colors.textMuted}
            autoCapitalize="none" autoCorrect={false} />

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail}
            placeholder="your@email.com" placeholderTextColor={Colors.textMuted}
            keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password *</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            placeholder="Min. 6 characters" placeholderTextColor={Colors.textMuted}
            secureTextEntry />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup} disabled={loading}
          >
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 32, fontWeight: "bold", color: Colors.primary },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
  form: { width: "100%" },
  label: { color: Colors.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 14, color: Colors.textPrimary, fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: 10, padding: 16,
    alignItems: "center", marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#0f172a", fontWeight: "bold", fontSize: 16 },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
});
