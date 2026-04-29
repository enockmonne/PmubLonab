import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import VersionToggle from "../src/VersionToggle";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: "#FAF9F6" }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FAF9F6" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="v2" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="resultats" />
          <Stack.Screen name="horse/[number]" />
          <Stack.Screen name="race/[race_id]" />
          <Stack.Screen name="horse-history/[name]" />
        </Stack>
        <VersionToggle />
      </View>
    </>
  );
}
