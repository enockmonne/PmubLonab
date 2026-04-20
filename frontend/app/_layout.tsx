import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FAF9F6" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="horse/[number]" />
        <Stack.Screen name="race/[race_id]" />
        <Stack.Screen name="horse-history/[name]" />
      </Stack>
    </>
  );
}
