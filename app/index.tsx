import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { getStoredUser } from "../lib/auth";
import { Colors } from "../constants/colors";

export default function Index() {
  useEffect(() => {
    async function checkAuth() {
      const user = await getStoredUser();
      if (user) {
        router.replace("/(tabs)/dashboard");
      } else {
        router.replace("/(auth)/login");
      }
    }
    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
