import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

function HeaderHome() {
  const router = useRouter();
  return (
    <TouchableOpacity
      testID="tab-home-btn"
      onPress={() => router.push("/")}
      style={styles.homeBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="home-outline" size={18} color="#0A2E1A" />
      <Text style={styles.homeText}>Accueil</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#FAF9F6",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E3D8",
        },
        headerTitleStyle: {
          fontSize: 13,
          fontWeight: "800",
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#0A2E1A",
        },
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerLeft: () => <HeaderHome />,
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
        name="programmes"
        options={{
          title: "Programme",
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="partants"
        options={{
          title: "Partants",
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pronostics"
        options={{
          title: "Pronos",
          tabBarIcon: ({ color, size }) => <Ionicons name="analytics-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="archives"
        options={{
          title: "Archives",
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  homeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0A2E1A",
    letterSpacing: 0.5,
    marginLeft: 2,
  },
});
