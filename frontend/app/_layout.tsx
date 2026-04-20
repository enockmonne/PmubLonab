import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0A2E1A",
          tabBarInactiveTintColor: "#8A8A8A",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: "#E5E3D8",
            borderTopWidth: 1,
            paddingTop: 6,
            height: 64,
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.3,
            textTransform: "uppercase",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Course",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="newspaper-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="partants"
          options={{
            title: "Partants",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="archives"
          options={{
            title: "Archives",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="pronostics"
          options={{
            title: "Pronos",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Stats",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="resultats" options={{ href: null }} />
        <Tabs.Screen name="admin" options={{ href: null }} />
        <Tabs.Screen name="horse/[number]" options={{ href: null }} />
        <Tabs.Screen name="race/[race_id]" options={{ href: null }} />
        <Tabs.Screen name="horse-history/[name]" options={{ href: null }} />
      </Tabs>
    </>
  );
}
