import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { theme, API_URL } from "./theme";

type Announcement = {
  id: string;
  message: string;
  level: "info" | "success" | "warning" | "error" | string;
};

const DISMISS_PREFIX = "pmub_ann_dismissed_";

const styleByLevel = (level: string) => {
  switch (level) {
    case "success":
      return { bg: "#E8F5E9", border: "#16A34A", icon: "checkmark-circle" as const };
    case "warning":
      return { bg: "#FFF7E6", border: "#D97706", icon: "warning" as const };
    case "error":
      return { bg: "#FEE2E2", border: theme.colors.accent, icon: "alert-circle" as const };
    default:
      return { bg: theme.colors.surface, border: theme.colors.gold, icon: "information-circle" as const };
  }
};

export default function AnnouncementBanner() {
  const [ann, setAnn] = useState<Announcement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/announcements/active`);
        const j = await r.json();
        const a = j.announcement;
        if (!a) return;
        const dismissed = await AsyncStorage.getItem(DISMISS_PREFIX + a.id);
        if (dismissed) return;
        setAnn(a);
      } catch {}
    })();
  }, []);

  if (!ann) return null;

  const s = styleByLevel(ann.level);

  const dismiss = async () => {
    await AsyncStorage.setItem(DISMISS_PREFIX + ann.id, "1");
    setAnn(null);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[
        styles.wrap,
        { backgroundColor: s.bg, borderLeftColor: s.border },
      ]}
      testID="announcement-banner"
    >
      <Ionicons name={s.icon} size={18} color={s.border} />
      <Text style={styles.message}>{ann.message}</Text>
      <TouchableOpacity onPress={dismiss} hitSlop={8}>
        <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
  },
  message: {
    flex: 1,
    fontSize: 12.5,
    color: theme.colors.textPrimary,
    fontWeight: "600",
    lineHeight: 17,
  },
});
