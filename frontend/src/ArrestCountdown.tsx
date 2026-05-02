import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "./theme";

/**
 * Live countdown to next « Arrêt des jeux ».
 * Schedule (post DST 29 Mars 2026):
 *  - Mon-Fri: 11:45
 *  - Sat-Sun: 13:05
 * If the time has passed today, show next slot.
 */
function getNextArrestTime(now: Date): Date {
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const isWeekend = day === 0 || day === 6;
  const target = new Date(now);
  if (isWeekend) {
    target.setHours(13, 5, 0, 0);
  } else {
    target.setHours(11, 45, 0, 0);
  }
  if (target.getTime() <= now.getTime()) {
    // shift to next day
    target.setDate(target.getDate() + 1);
    const nextDay = target.getDay();
    const nextIsWeekend = nextDay === 0 || nextDay === 6;
    if (nextIsWeekend) target.setHours(13, 5, 0, 0);
    else target.setHours(11, 45, 0, 0);
  }
  return target;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h >= 24) {
    const days = Math.floor(h / 24);
    const remH = h % 24;
    return `${days}j ${pad(remH)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ArrestCountdown({
  variant = "compact",
}: {
  variant?: "compact" | "full";
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = getNextArrestTime(now);
  const remaining = target.getTime() - now.getTime();
  const remainingStr = formatRemaining(remaining);

  const isUrgent = remaining < 1000 * 60 * 30; // <30min
  const targetTime = target.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = target.getDay();
  const dayLabel = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."][day];

  if (variant === "compact") {
    return (
      <View style={[styles.compact, isUrgent && styles.compactUrgent]}>
        <Ionicons
          name="time"
          size={14}
          color={isUrgent ? "#fff" : theme.colors.gold}
        />
        <Text style={[styles.compactText, isUrgent && styles.compactTextUrgent]}>
          Arrêt à {targetTime} • {remainingStr}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.full, isUrgent && styles.fullUrgent]}>
      <View style={styles.fullHeader}>
        <Ionicons
          name="alarm-outline"
          size={16}
          color={isUrgent ? "#fff" : theme.colors.gold}
        />
        <Text
          style={[styles.fullOverline, isUrgent && { color: "#fff" }]}
        >
          Arrêt des jeux
        </Text>
      </View>
      <Text style={[styles.fullCountdown, isUrgent && { color: "#fff" }]}>
        {remainingStr}
      </Text>
      <Text style={[styles.fullSub, isUrgent && { color: "rgba(255,255,255,0.7)" }]}>
        {dayLabel} à {targetTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
  },
  compactUrgent: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    borderLeftColor: "#fff",
  },
  compactText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: 0.4,
    fontVariant: ["tabular-nums"],
  },
  compactTextUrgent: { color: "#fff" },
  full: {
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.gold,
  },
  fullUrgent: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    borderLeftColor: "#fff",
  },
  fullHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  fullOverline: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  fullCountdown: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "900",
    fontFamily: theme.fonts.serifBlack,
    color: theme.colors.textPrimary,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  fullSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
