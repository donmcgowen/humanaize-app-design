import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { trpc, createTRPCClient, queryClient } from "../lib/trpc";
import { AuthProvider } from "../lib/AuthContext";

export default function RootLayout() {
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" backgroundColor="#0f172a" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: "#0f172a" },
                headerTintColor: "#f1f5f9",
                headerTitleStyle: { fontWeight: "bold" },
                contentStyle: { backgroundColor: "#0f172a" },
                animation: "fade",
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="scan" options={{ headerShown: false, presentation: "fullScreenModal" }} />
              <Stack.Screen name="assistant" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
}
