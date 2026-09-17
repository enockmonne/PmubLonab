import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchJson } from "./apiClient";
import { API_URL, theme } from "./theme";

type SourceLeader = {
  source: string;
  aliases?: string[];
  evaluated_races: number;
  top_pick_wins: number;
  top_pick_top3: number;
  base_in_top3: number;
  win_rate: number;
  top3_rate: number;
};

type ExcludedStats = {
  no_predictions: number;
  no_official_results: number;
};

type SourceNormalization = {
  source: string;
  aliases: string[];
};

type Methodology = {
  source_metric?: string;
  result_priority?: string;
  exclusion_rule?: string;
};

type SourcesResponse = {
  leaderboard: SourceLeader[];
  evaluated_races: number;
  linked_results_used: number;
  excluded: ExcludedStats;
  source_normalization: SourceNormalization[];
  methodology: Methodology;
};

type SortMode = "top3" | "wins" | "coverage";

const SORTS: { key: SortMode; label: string }[] = [
  { key: "top3", label: "Top 3" },
  { key: "wins", label: "Gagnants" },
  { key: "coverage", label: "Volume" },
];

const EMPTY_EXCLUDED = { no_predictions: 0, no_official_results: 0 };

export default function AnalysisSourcesScreen() {
  const [leaders, setLeaders] = useState<SourceLeader[]>([]);
  const [evaluatedRaces, setEvaluatedRaces] = useState(0);
  const [linkedResultsUsed, setLinkedResultsUsed] = useState(0);
  const [excluded, setExcluded] = useState<ExcludedStats>(EMPTY_EXCLUDED);
  const [normalization, setNormalization] = useState<SourceNormalization[]>([]);
  const [methodology, setMethodology] = useState<Methodology>({});
  const [sort, setSort] = useState<SortMode>("top3");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotice(null);
      const data = await fetchJson<SourcesResponse>(`${API_URL}/api/stats/tipsters`, {
        timeoutMs: 12000,
      });
      setLeaders(data.leaderboard || []);
      setEvaluatedRaces(data.evaluated_races || 0);
      setLinkedResultsUsed(data.linked_results_used || 0);
      setExcluded(data.excluded || EMPTY_EXCLUDED);
      setNormalization(data.source_normalization || []);
      setMethodology(data.methodology || {});
    } catch (error) {
      console.error(error);
      setNotice("Connexion lente - impossible de charger les sources.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedLeaders = useMemo(() => {
    return [...leaders].sort((a, b) => {
      if (sort === "wins") return b.win_rate - a.win_rate || b.top3_rate - a.top3_rate;
      if (sort === "coverage") return b.evaluated_races - a.evaluated_races || b.top3_rate - a.top3_rate;
      return b.top3_rate - a.top3_rate || b.win_rate - a.win_rate || b.evaluated_races - a.evaluated_races;
    });
  }, [leaders, sort]);

  const excludedTotal = excluded.no_predictions + excluded.no_official_results;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        testID="analysis-sources-list"
        data={sortedLeaders}
        keyExtractor={(item) => item.source}
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
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.overline}>Fiabilite des pronostics</Text>
              <Text style={styles.title}>Sources</Text>
              <Text style={styles.lead}>
                Comparez les sources selon leur numero 1 face aux resultats officiels relies. Ce tableau sert a auditer la couverture, pas a recommander un pari.
              </Text>
            </View>

            {notice ? (
              <View style={styles.notice}>
                <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.gold} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            <View style={styles.metricsGrid}>
              <Metric label="Sources" value={leaders.length} icon="newspaper-outline" />
              <Metric label="Courses evaluees" value={evaluatedRaces} icon="flag-outline" />
              <Metric label="Resultats lies" value={linkedResultsUsed} icon="git-compare-outline" />
              <Metric label="Courses exclues" value={excludedTotal} icon="remove-circle-outline" />
            </View>

            <View style={styles.sortWrap}>
              {SORTS.map((item) => {
                const active = sort === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.75}
                    onPress={() => setSort(item.key)}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                  >
                    <Text style={[styles.sortText, active && styles.sortTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.methodology}>
              <Ionicons name="information-circle-outline" size={17} color={theme.colors.gold} />
              <View style={styles.methodologyBody}>
                <Text style={styles.methodologyText}>
                  {methodology.source_metric ||
                    "Le classement mesure le numero 1 de chaque source face aux resultats officiels."}
                </Text>
                <Text style={styles.methodologyText}>
                  {methodology.result_priority ||
                    "Les resultats officiels lies sont utilises en priorite."}
                </Text>
                <Text style={styles.methodologyText}>
                  {excluded.no_predictions} sans pronostic et {excluded.no_official_results} sans resultat officiel exploitable.
                </Text>
              </View>
            </View>

            {normalization.length ? (
              <View style={styles.aliasPanel}>
                <Text style={styles.aliasTitle}>Sources fusionnees</Text>
                {normalization.slice(0, 3).map((item) => (
                  <Text key={item.source} style={styles.aliasText}>
                    {item.source}: {item.aliases.join(", ")}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.listIntro}>
              <Text style={styles.sectionKicker}>Classement</Text>
              <Text style={styles.sectionTitle}>Performance par source</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => <SourceRow item={item} rank={index + 1} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={28} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>Aucune source classee avec les resultats disponibles.</Text>
            </View>
          )
        }
        contentContainerStyle={styles.content}
      />
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={18} color={theme.colors.gold} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SourceRow({ item, rank }: { item: SourceLeader; rank: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.rankBox}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sourceName} numberOfLines={1}>
          {item.source}
        </Text>
        <Text style={styles.sourceMeta}>
          {item.evaluated_races} courses evaluees
          {item.aliases?.length ? ` - ${item.aliases.length} alias fusionne${item.aliases.length > 1 ? "s" : ""}` : ""}
        </Text>
        <View style={styles.statLine}>
          <Badge label={`${item.top_pick_wins} gagnant${item.top_pick_wins > 1 ? "s" : ""}`} />
          <Badge label={`${item.top_pick_top3} top 3`} />
          <Badge label={`${item.base_in_top3} bases top 3`} />
        </View>
      </View>
      <View style={styles.rateBox}>
        <Text style={styles.rateValue}>{item.top3_rate}%</Text>
        <Text style={styles.rateLabel}>Top 3</Text>
        <Text style={styles.winRate}>{item.win_rate}% gagnant</Text>
      </View>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingBottom: 32 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  overline: {
    color: theme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serifBlack,
    fontSize: 34,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  lead: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  notice: {
    alignItems: "center",
    backgroundColor: "#FBF7EC",
    borderColor: theme.colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
  },
  noticeText: { color: theme.colors.textSecondary, flex: 1, fontSize: 12, fontWeight: "700" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 92,
    padding: 12,
  },
  metricValue: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sortWrap: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sortChip: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 8,
  },
  sortChipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  sortText: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sortTextActive: { color: "#fff" },
  methodology: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
  },
  methodologyBody: { flex: 1, gap: 5 },
  methodologyText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  aliasPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
  },
  aliasTitle: {
    color: theme.colors.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  aliasText: { color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16 },
  listIntro: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  sectionKicker: {
    color: theme.colors.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  row: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    minHeight: 106,
    padding: 12,
  },
  rankBox: {
    alignItems: "center",
    backgroundColor: theme.colors.brand,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  rankText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  sourceName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  sourceMeta: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  statLine: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: "800" },
  rateBox: { alignItems: "center", minWidth: 64 },
  rateValue: { color: theme.colors.gold, fontSize: 16, fontWeight: "900" },
  rateLabel: {
    color: theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  winRate: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: "800", marginTop: 4 },
  empty: { alignItems: "center", padding: 32 },
  emptyText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: "center" },
  loadingOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    pointerEvents: "none",
    position: "absolute",
    right: 0,
    top: 0,
  },
});
