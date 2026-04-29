import { Stack } from "expo-router";

export default function V2Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FAFAFA" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="resultats" />
    </Stack>
  );
}
