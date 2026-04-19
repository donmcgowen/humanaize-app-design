import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { trpc, createTRPCClient, queryClient } from "../lib/trpc";

export default function RootLayout() {
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor="#0f172a" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0f172a" },
            headerTintColor: "#f1f5f9",
            headerTitleStyle: { fontWeight: "bold" },
            contentStyle: { backgroundColor: "#0f172a" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
