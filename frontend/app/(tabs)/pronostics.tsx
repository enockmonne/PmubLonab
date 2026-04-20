import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme, API_URL } from "../../src/theme";

type ExpertPred = { source: string; picks: number[] };
type Consensus = { number: number; score: number; appearances: number };
type Data = {
  experts: ExpertPred[];
  consensus: Consensus[];
  classifications: Record<string, number[]>;
};

type Tab = "consensus" | "experts" | "classifications";

export default function PronosticsScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("consensus");
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/predictions`);
      const j = await r.json();
      setData(j);
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
      <View style={styles.loader} testID="pronostics-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const maxScore = Math.max(...data.consensus.map((c) => c.score));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.overline}>Analyse</Text>
        <Text style={styles.title}>Pronostics</Text>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { k: "consensus", label: "Consensus" },
            { k: "experts", label: "Médias" },
            { k: "classifications", label: "Catégories" },
          ] as { k: Tab; label: string }[]
        ).map((t) => (
          <TouchableOpacity
            key={t.k}
            testID={`tab-${t.k}`}
            style={styles.tabBtn}
            onPress={() => setTab(t.k)}
          >
            <Text
              style={[
                styles.tabText,
                tab === t.k && styles.tabTextActive,
              ]}
            >
              {t.label}
            </Text>
            <View
              style={[styles.tabUnderline, tab === t.k && styles.tabUnderlineActive]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
        {tab === "consensus" && (
          <View testID="consensus-view">
            <Text style={styles.lead}>
              Classement calculé à partir de 7 médias. Plus un cheval figure haut
              dans les pronostics, plus son score est élevé.
            </Text>
            {data.consensus
              .filter((c) => c.score > 0)
              .map((c, idx) => (
                <TouchableOpacity
                  key={c.number}
                  testID={`consensus-row-${c.number}`}
                  style={styles.consensusRow}
                  onPress={() => router.push(`/horse/${c.number}`)}
                >
                  <Text style={styles.consensusRank}>#{idx + 1}</Text>
                  <View style={styles.horseNumSmall}>
                    <Text style={styles.horseNumSmallText}>{c.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${(c.score / maxScore) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.barMeta}>
                      {c.score} points • cité par {c.appearances}/7 médias
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {tab === "experts" && (
          <View testID="experts-view">
            <Text style={styles.lead}>
              Les bases de chaque média, classées par ordre de priorité.
            </Text>
            {data.experts.map((e) => (
              <View key={e.source} style={styles.expertCard}>
                <Text style={styles.expertSource}>{e.source}</Text>
                <View style={styles.picksRow}>
                  {e.picks.map((p, idx) => (
                    <TouchableOpacity
                      key={`${e.source}-${p}`}
                      onPress={() => router.push(`/horse/${p}`)}
                      style={[
                        styles.pickChip,
                        idx === 0 && styles.pickChipBase,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickChipText,
                          idx === 0 && styles.pickChipBaseText,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === "classifications" && (
          <View testID="classifications-view">
            <Text style={styles.lead}>
              Les 5 meilleurs dans chaque catégorie selon la rédaction.
            </Text>
            {Object.entries(data.classifications).map(([cat, nums]) => (
              <View key={cat} style={styles.catCard}>
                <Text style={styles.catTitle}>{cat}</Text>
                <View style={styles.picksRow}>
                  {nums.map((n) => (
                    <TouchableOpacity
                      key={`${cat}-${n}`}
                      onPress={() => router.push(`/horse/${n}`)}
                      style={styles.pickChip}
                    >
                      <Text style={styles.pickChipText}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
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
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  overline: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtn: { marginRight: 20, paddingVertical: 10 },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tabTextActive: { color: theme.colors.brand },
  tabUnderline: {
    height: 2,
    marginTop: 8,
    backgroundColor: "transparent",
  },
  tabUnderlineActive: { backgroundColor: theme.colors.brand },
  lead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  consensusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  consensusRank: {
    fontSize: 13,
    color: theme.colors.gold,
    fontWeight: "800",
    width: 32,
    letterSpacing: 0.5,
  },
  horseNumSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  horseNumSmallText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  barBg: {
    height: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  barFill: {
    height: "100%",
    backgroundColor: theme.colors.gold,
  },
  barMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  expertCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  expertSource: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  picksRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pickChip: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  pickChipBase: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  pickChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  pickChipBaseText: { color: "#fff" },
  catCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  catTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.gold,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
});
