import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "./theme";

type BettingInfo = {
  arret_jeux_weekday?: string;
  arret_jeux_weekend?: string;
  arret_jeux_nocturne?: string;
};

type ArrestCountdownProps = {
  variant?: "compact" | "full";
  betting?: BettingInfo | null;
  dateIso?: string | null;
  eventType?: string | null;
  meetingLabel?: string | null;
};

function parseArrestTime(value?: string): { hours: number; minutes: number } | null {
  const text = (value || "").trim();
  if (!text) return null;

  const match = text.match(/(\d{1,2})\s*(?:h|:)\s*(\d{1,2})?/i);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

function buildLocalDate(dateIso?: string | null): Date {
  const [year, month, day] = String(dateIso || "").slice(0, 10).split("-").map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day);
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getArrestTarget({
  betting,
  dateIso,
  eventType,
  meetingLabel,
}: Pick<ArrestCountdownProps, "betting" | "dateIso" | "eventType" | "meetingLabel">): Date {
  const target = buildLocalDate(dateIso);
  const day = target.getDay();
  const isWeekend = day === 0 || day === 6;
  const isNocturne = `${eventType || ""} ${meetingLabel || ""}`.toLowerCase().includes("nocturne");
  const rawTime =
    (isNocturne && betting?.arret_jeux_nocturne) ||
    (isWeekend ? betting?.arret_jeux_weekend : betting?.arret_jeux_weekday) ||
    betting?.arret_jeux_weekday ||
    betting?.arret_jeux_weekend ||
    "11h 45mn";
  const parsed = parseArrestTime(rawTime) || { hours: 11, minutes: 45 };
  target.setHours(parsed.hours, parsed.minutes, 0, 0);
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
  betting,
  dateIso,
  eventType,
  meetingLabel,
}: ArrestCountdownProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = useMemo(
    () => getArrestTarget({ betting, dateIso, eventType, meetingLabel }),
    [betting, dateIso, eventType, meetingLabel]
  );
  const remaining = target.getTime() - now.getTime();
  const remainingStr = formatRemaining(remaining);
  const hasEnded = remaining <= 0;
  const isUrgent = remaining > 0 && remaining < 1000 * 60 * 30;
  const targetTime = target.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = target.getDay();
  const dayLabel = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."][day];
  const dateLabel = target.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const titleDate = isSameCalendarDay(target, now) ? `Aujourd'hui ${dateLabel}` : dateLabel;

  if (variant === "compact") {
    return (
      <View style={[styles.compact, isUrgent && styles.compactUrgent, hasEnded && styles.ended]}>
        <Ionicons
          name={hasEnded ? "checkmark-circle-outline" : "time"}
          size={14}
          color={isUrgent ? "#fff" : theme.colors.gold}
        />
        <Text style={[styles.compactText, isUrgent && styles.compactTextUrgent]}>
          {hasEnded ? "Jeux terminés" : `Arrêt à ${targetTime} • ${remainingStr}`}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.full, isUrgent && styles.fullUrgent, hasEnded && styles.ended]}>
      <View style={styles.fullHeader}>
        <Ionicons
          name={hasEnded ? "checkmark-circle-outline" : "alarm-outline"}
          size={16}
          color={isUrgent ? "#fff" : theme.colors.gold}
        />
        <Text style={[styles.fullOverline, isUrgent && { color: "#fff" }]}>
          Arrêt des jeux · {titleDate}
        </Text>
      </View>
      <Text style={[styles.fullCountdown, isUrgent && { color: "#fff" }]}>
        {hasEnded ? "Jeux terminés" : remainingStr}
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
  ended: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
  },
  fullHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  fullOverline: {
    flex: 1,
    fontSize: 11,
    letterSpacing: 1.6,
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
    fontVariant: ["tabular-nums"],
  },
  fullSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: "700",
  },
});
