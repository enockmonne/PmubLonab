import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { IS_ANALYSIS_APP } from "../../src/product";

type TabConfig = {
  name: string;
  title: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
};

const CORE_TABS: TabConfig[] = [
  { name: "programmes", title: "Programme", activeIcon: "newspaper", inactiveIcon: "newspaper-outline" },
  { name: "partants", title: "Partants", activeIcon: "list", inactiveIcon: "list-outline" },
  { name: "pronostics", title: "Pronos", activeIcon: "analytics", inactiveIcon: "analytics-outline" },
  { name: "archives", title: "Recherche", activeIcon: "albums", inactiveIcon: "albums-outline" },
  { name: "stats", title: "Stats", activeIcon: "stats-chart", inactiveIcon: "stats-chart-outline" },
];

const ANALYSIS_TABS: TabConfig[] = [
  { name: "archives", title: "Recherche", activeIcon: "search", inactiveIcon: "search-outline" },
  { name: "partants", title: "Chevaux", activeIcon: "people", inactiveIcon: "people-outline" },
  { name: "programmes", title: "Courses", activeIcon: "flag", inactiveIcon: "flag-outline" },
  { name: "pronostics", title: "Sources", activeIcon: "newspaper", inactiveIcon: "newspaper-outline" },
  { name: "stats", title: "Analyses", activeIcon: "stats-chart", inactiveIcon: "stats-chart-outline" },
];

function HeaderHome() {
  const router = useRouter();
  return (
    <TouchableOpacity
      testID="tab-home-btn"
      onPress={() => router.push("/")}
      style={styles.homeBtn}
      activeOpacity={0.75}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="home" size={16} color="#FFFFFF" />
      <Text style={styles.homeText}>Accueil</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const tabs = IS_ANALYSIS_APP ? ANALYSIS_TABS : CORE_TABS;

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
        headerLeftContainerStyle: { paddingLeft: 12 },
        tabBarActiveTintColor: "#0A2E1A",
        tabBarInactiveTintColor: "#6F6F6F",
        tabBarStyle: {
          backgroundColor: "#F1EFE7",
          borderTopColor: "#C8B88A",
          borderTopWidth: 2,
          paddingTop: 9,
          height: 76,
          paddingBottom: 11,
          shadowColor: "#0A2E1A",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 14,
        },
        tabBarItemStyle: {
          paddingHorizontal: 2,
          borderLeftWidth: 1,
          borderLeftColor: "#DDD7C5",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginTop: 3,
        },
        tabBarIcon: () => null,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <ActiveIconWrap focused={focused}>
                <Ionicons
                  name={focused ? tab.activeIcon : tab.inactiveIcon}
                  size={20}
                  color={focused ? "#FFFFFF" : color}
                />
              </ActiveIconWrap>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

function ActiveIconWrap({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#0A2E1A",
    borderRadius: 999,
  },
  homeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginLeft: 2,
  },
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E1DAC7",
    backgroundColor: "#FAF9F6",
  },
  iconWrapActive: {
    backgroundColor: "#0A2E1A",
    borderColor: "#C8B88A",
  },
});
