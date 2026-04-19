import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/colors";
import { login } from "../../lib/auth";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your username and password.");
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (result.success) {
      router.replace("/(tabs)/dashboard");
    } else {
      Alert.alert("Login Failed", result.message || "Invalid credentials.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Logo / Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>HumanAIze</Text>
        <Text style={styles.tagline}>AI-Powered Health Intelligence</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social login placeholders */}
        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.socialButton, { marginTop: 10 }]}>
          <Text style={styles.socialButtonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        {/* Sign up link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: "bold",
    color: Colors.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  form: {
    width: "100%",
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    marginHorizontal: 12,
    fontSize: 13,
  },
  socialButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  socialButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  signupText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
