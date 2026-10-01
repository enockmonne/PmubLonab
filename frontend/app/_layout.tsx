import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { usePushRegistration } from "../src/push";
import BetaAccessGate from "../src/BetaAccessGate";
import { theme } from "../src/theme";

export default function RootLayout() {
  const [sansLoaded] = useInter({
    Inter_400Regular,
    Inter_700Bold,
    Inter_900Black,
  });

  if (!sansLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <BetaAccessGate>
        <AppStack />
      </BetaAccessGate>
    </>
  );
}

function AppStack() {
  usePushRegistration();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="resultats" />
      <Stack.Screen name="search" />
      <Stack.Screen name="compare" />
      <Stack.Screen name="horse/[number]" />
      <Stack.Screen name="race/[race_id]" />
      <Stack.Screen name="horse-history/[name]" />
      <Stack.Screen name="person-history/[role]/[name]" />
      <Stack.Screen name="source-history/[source]" />
    </Stack>
  );
}
