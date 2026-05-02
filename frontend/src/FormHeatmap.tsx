import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "./theme";

type Props = {
  perf: string; // e.g. "4.9.1.1.0" or "1-3-5-2-7"
  size?: number;
};

/**
 * Visual heatmap of last 5 race finishes.
 * 1 → gold (winner) | 2-3 → green (placed) | 4-5 → ochre | 6+ → grey | 0/? → light grey
 * Most recent first (left-to-right).
 */
export default function FormHeatmap({ perf, size = 28 }: Props) {
  if (!perf) return null;
  // tokenize: split by . / - or spaces
  const tokens = perf
    .split(/[.\-/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (tokens.length === 0) return null;

  const colorFor = (t: string) => {
    const n = Number.parseInt(t, 10);
    if (Number.isNaN(n) || n === 0) return { bg: theme.colors.surfaceAlt, fg: theme.colors.textSecondary };
    if (n === 1) return { bg: theme.colors.gold, fg: "#fff" };
    if (n <= 3) return { bg: "#16A34A", fg: "#fff" };
    if (n <= 5) return { bg: "#D97706", fg: "#fff" };
    return { bg: "#94A3B8", fg: "#fff" };
  };

  return (
    <View style={styles.wrap}>
      {tokens.map((t, i) => {
        const c = colorFor(t);
        return (
          <View
            key={`${t}-${i}`}
            style={[
              styles.cell,
              { width: size, height: size, backgroundColor: c.bg },
            ]}
          >
            <Text style={[styles.cellText, { color: c.fg }]}>{t}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 4,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  cellText: {
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
