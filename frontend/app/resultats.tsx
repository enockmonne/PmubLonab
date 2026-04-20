import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme, API_URL, formatFCFA } from "../src/theme";

type Payout = { type: string; amount_fcfa: number; label: string };
type Previous = {
  date: string;
  race_name: string;
  finishing_order: number[];
  npo: number[];
  fallers_dq: number[];
  payouts: Payout[];
};

export default function ResultatsScreen() {
  const [data, setData] = useState<Previous | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/results`);
      const j = await r.json();
      setData(j.previous);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <View style={styles.loader} testID="results-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        testID="results-screen"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.brand}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.overline}>Résultats de la course précédente</Text>
          <Text style={styles.title}>{data.race_name}</Text>
          <Text style={styles.date}>{data.date}</Text>
        </View>

        {/* Finishing order podium */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ordre d&apos;arrivée</Text>
          <View style={styles.podiumRow}>
            {data.finishing_order.map((num, idx) => (
              <View
                key={num}
                style={[
                  styles.podiumItem,
                  idx === 0 && styles.podiumItemGold,
                ]}
                testID={`finish-${idx + 1}`}
              >
                <Text style={styles.podiumPos}>{idx + 1}</Text>
                <Text
                  style={[
                    styles.podiumHorseNum,
                    idx === 0 && { color: "#fff" },
                  ]}
                >
                  {num}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* NPO + fallers */}
        <View style={styles.noteRow}>
          <View style={styles.noteCell}>
            <Text style={styles.noteLabel}>NPO</Text>
            <Text style={styles.noteValue}>
              {data.npo.join(", ") || "—"}
            </Text>
          </View>
          <View style={styles.noteCell}>
            <Text style={styles.noteLabel}>Tombés / DQ</Text>
            <Text style={styles.noteValue}>
              {data.fallers_dq.join(", ") || "—"}
            </Text>
          </View>
        </View>

        {/* Payouts table */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Rapports</Text>
          <View style={styles.table}>
            {data.payouts.map((p, idx) => (
              <View
                key={p.type}
                style={[
                  styles.tableRow,
                  idx === data.payouts.length - 1 && { borderBottomWidth: 0 },
                ]}
                testID={`payout-row-${idx}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutType}>{p.type}</Text>
                  {p.label ? (
                    <Text style={styles.payoutLabel}>{p.label}</Text>
                  ) : null}
                </View>
                <Text style={styles.payoutAmt}>
                  {formatFCFA(p.amount_fcfa)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  overline: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  date: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  podiumRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  podiumItem: {
    flex: 1,
    minWidth: 56,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  podiumItemGold: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  podiumPos: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1,
  },
  podiumHorseNum: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  noteRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  noteCell: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  noteLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  noteValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  payoutType: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  payoutLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  payoutAmt: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.brand,
    letterSpacing: -0.3,
  },
});
