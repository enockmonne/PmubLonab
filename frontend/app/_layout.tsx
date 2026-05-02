import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import {
  useFonts as usePlayfair,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from "@expo-google-fonts/playfair-display";
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";

export default function RootLayout() {
  const [serifLoaded] = usePlayfair({
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
  });
  const [sansLoaded] = useInter({
    Inter_400Regular,
    Inter_700Bold,
    Inter_900Black,
  });

  if (!serifLoaded || !sansLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FAF9F6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#0A2E1A" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FAF9F6" },
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
      </Stack>
    </>
  );
}
