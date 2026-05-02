import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Line, Circle, Rect, G, Text as SvgText, Path } from "react-native-svg";
import { theme } from "./theme";

type Props = {
  perf: string;
  width?: number;
  height?: number;
};

/**
 * Performance line chart based on the "perf" string (last 5 race positions).
 * Y-axis inverted: 1 at top, 10 at bottom. Color codes points by performance level.
 * Includes a trend indicator (last vs first).
 */
export default function PerformanceChart({
  perf,
  width = Dimensions.get("window").width - 64,
  height = 160,
}: Props) {
  const tokens = (perf || "")
    .split(/[.\-/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (tokens.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucune donnée de performance disponible</Text>
      </View>
    );
  }

  const positions = tokens.map((t) => {
    const n = Number.parseInt(t, 10);
    return Number.isNaN(n) || n === 0 ? 10 : Math.min(n, 10);
  });

  // Reverse so most recent is on the right (more intuitive)
  const reversed = [...positions].reverse();

  const padX = 30;
  const padTop = 20;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const stepX = innerW / Math.max(reversed.length - 1, 1);
  const yFor = (pos: number) => padTop + ((pos - 1) / 9) * innerH;

  const pointXs = reversed.map((_, i) => padX + i * stepX);
  const pointYs = reversed.map((p) => yFor(p));

  const path = pointXs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${pointYs[i].toFixed(1)}`)
    .join(" ");

  const colorFor = (n: number) => {
    if (n === 1) return theme.colors.gold;
    if (n <= 3) return "#16A34A";
    if (n <= 5) return "#D97706";
    return "#94A3B8";
  };

  // Trend: avg of first 2 vs last 2
  const half = Math.floor(reversed.length / 2);
  const oldAvg =
    reversed.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(half, 1);
  const recentAvg =
    reversed.slice(-half).reduce((a, b) => a + b, 0) / Math.max(half, 1);
  let trend: "up" | "down" | "flat" = "flat";
  if (oldAvg - recentAvg >= 1) trend = "up"; // improving
  else if (recentAvg - oldAvg >= 1) trend = "down";
  const trendLabel =
    trend === "up" ? "En progression" : trend === "down" ? "En baisse" : "Stable";
  const trendColor =
    trend === "up"
      ? "#16A34A"
      : trend === "down"
      ? theme.colors.accent
      : theme.colors.textSecondary;

  return (
    <View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.gold }]} />
          <Text style={styles.legendText}>1er</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#16A34A" }]} />
          <Text style={styles.legendText}>Top 3</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#D97706" }]} />
          <Text style={styles.legendText}>4-5</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#94A3B8" }]} />
          <Text style={styles.legendText}>6+</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.trendText, { color: trendColor }]}>{trendLabel}</Text>
      </View>

      <Svg width={width} height={height}>
        {/* Grid lines for positions 1, 5, 10 */}
        {[1, 3, 5, 10].map((p) => (
          <G key={p}>
            <Line
              x1={padX}
              x2={padX + innerW}
              y1={yFor(p)}
              y2={yFor(p)}
              stroke={theme.colors.border}
              strokeWidth={1}
              strokeDasharray={p === 1 ? "0" : "3,3"}
            />
            <SvgText
              x={padX - 6}
              y={yFor(p) + 3}
              fontSize="9"
              fill={theme.colors.textSecondary}
              textAnchor="end"
              fontWeight="700"
            >
              {p}
            </SvgText>
          </G>
        ))}

        {/* Filled area below line */}
        <Path
          d={`${path} L ${pointXs[pointXs.length - 1]} ${padTop + innerH} L ${pointXs[0]} ${padTop + innerH} Z`}
          fill={theme.colors.gold}
          opacity={0.08}
        />

        {/* Path */}
        <Path
          d={path}
          stroke={theme.colors.brand}
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points */}
        {reversed.map((p, i) => {
          const c = colorFor(p);
          return (
            <G key={i}>
              <Circle
                cx={pointXs[i]}
                cy={pointYs[i]}
                r={9}
                fill={c}
                stroke="#fff"
                strokeWidth={2}
              />
              <SvgText
                x={pointXs[i]}
                y={pointYs[i] + 3}
                fontSize="9.5"
                fill="#fff"
                textAnchor="middle"
                fontWeight="800"
              >
                {p === 10 ? "?" : String(p)}
              </SvgText>
              {/* x-axis label: -N (race index) */}
              <SvgText
                x={pointXs[i]}
                y={padTop + innerH + 16}
                fontSize="9"
                fill={theme.colors.textSecondary}
                textAnchor="middle"
                fontWeight="700"
              >
                {i === reversed.length - 1 ? "Dernière" : `-${reversed.length - 1 - i}`}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: "600" },
  trendText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
