import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchJson } from "./apiClient";
import { API_URL, theme } from "./theme";

type HorseLeader = {
  name: string;
  runs: number;
  wins: number;
  top3: number;
  win_rate: number;
  top3_rate: number;
  latest_date?: string;
  latest_race_id?: string;
  latest_race_name?: string;
  latest_position?: number | null;
};

type HorseStatsResponse = {
  leaderboard: HorseLeader[];
  evaluated_races: number;
  linked_results_used: number;
  methodology: string;
};

type SortMode = "top3" | "wins" | "runs";

const SORTS: { key: SortMode; label: string }[] = [
  { key: "top3", label: "Top 3" },
  { key: "wins", label: "Victoires" },
  { key: "runs", label: "Courses" },
];

export default function AnalysisChevauxScreen() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<HorseLeader[]>([]);
  const [evaluatedRaces, setEvaluatedRaces] = useState(0);
  const [linkedResultsUsed, setLinkedResultsUsed] = useState(0);
  const [methodology, setMethodology] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("top3");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotice(null);
      const data = await fetchJson<HorseStatsResponse>(`${API_URL}/api/stats/horses`, {
        timeoutMs: 12000,
      });
      setLeaders(data.leaderboard || []);
      setEvaluatedRaces(data.evaluated_races || 0);
      setLinkedResultsUsed(data.linked_results_used || 0);
      setMethodology(data.methodology || "");
    } catch (error) {
      console.error(error);
      setNotice("Connexion lente - impossible de charger les profils chevaux.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? leaders.filter((horse) => horse.name.toLowerCase().includes(q)) : leaders;
    return [...list].sort((a, b) => {
      if (sort === "wins") return b.wins - a.wins || b.top3 - a.top3 || a.name.localeCompare(b.name);
      if (sort === "runs") return b.runs - a.runs || b.top3 - a.top3 || a.name.localeCompare(b.name);
      return b.top3_rate - a.top3_rate || b.top3 - a.top3 || b.wins - a.wins || a.name.localeCompare(b.name);
    });
  }, [leaders, query, sort]);

  const summary = useMemo(() => {
    const totalRuns = leaders.reduce((sum, horse) => sum + (horse.runs || 0), 0);
    const winners = leaders.filter((horse) => horse.wins > 0).length;
    return { totalRuns, winners };
  }, [leaders]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        testID="analysis-horses-list"
        data={filtered}
        keyExtractor={(item) => item.name}
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
              <Text style={styles.overline}>Profils historiques</Text>
              <Text style={styles.title}>Chevaux</Text>
              <Text style={styles.lead}>
                Classement base sur les arrivees officielles reliees. Les taux doivent etre lus avec la couverture disponible.
              </Text>
            </View>

            {notice ? (
              <View style={styles.notice}>
                <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.gold} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            <View style={styles.metricsGrid}>
              <Metric label="Chevaux" value={leaders.length} icon="ribbon-outline" />
              <Metric label="Courses evaluees" value={evaluatedRaces} icon="flag-outline" />
              <Metric label="Resultats lies" value={linkedResultsUsed} icon="git-compare-outline" />
              <Metric label="Avec victoire" value={summary.winners} icon="trophy-outline" />
            </View>

            <View style={styles.searchPanel}>
              <Text style={styles.searchLabel}>Trouver un cheval</Text>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={17} color={theme.colors.textSecondary} />
                <TextInput
                  testID="analysis-horse-search"
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchInput}
                  placeholder="Nom du cheval..."
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCorrect={false}
                />
                {query.length > 0 ? (
                  <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.sortWrap}>
              {SORTS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.sortChip, sort === item.key && styles.sortChipActive]}
                  onPress={() => setSort(item.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.sortText, sort === item.key && styles.sortTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {methodology ? (
              <View style={styles.methodology}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.brand} />
                <Text style={styles.methodologyText}>{methodology}</Text>
              </View>
            ) : null}

            <View style={styles.listIntro}>
              <Text style={styles.sectionKicker}>Classement</Text>
              <Text style={styles.sectionTitle}>
                {query.trim() ? `${filtered.length} resultat${filtered.length > 1 ? "s" : ""}` : "Chevaux suivis"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="ribbon-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>Aucun cheval trouve avec les resultats disponibles.</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <HorseRow
            item={item}
            rank={index + 1}
            onPress={() => router.push(`/horse-history/${encodeURIComponent(item.name)}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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

function HorseRow({ item, rank, onPress }: { item: HorseLeader; rank: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rankBox}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.horseName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.horseMeta} numberOfLines={1}>
          {item.latest_race_name || "Derniere course non renseignee"}
        </Text>
        <View style={styles.statLine}>
          <Badge label={`${item.runs} course${item.runs > 1 ? "s" : ""}`} />
          <Badge label={`${item.wins} victoire${item.wins > 1 ? "s" : ""}`} />
          <Badge label={`${item.top3} top 3`} />
        </View>
      </View>
      <View style={styles.rateBox}>
        <Text style={styles.rateValue}>{item.top3_rate}%</Text>
        <Text style={styles.rateLabel}>Top 3</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
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
  searchPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
  },
  searchLabel: {
    color: theme.colors.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    minWidth: 0,
  },
  sortWrap: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sortChip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
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
  methodologyText: {
    color: theme.colors.textSecondary,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
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
    minHeight: 92,
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
  horseName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  horseMeta: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  statLine: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: "800" },
  rateBox: { alignItems: "center", minWidth: 52 },
  rateValue: { color: theme.colors.gold, fontSize: 16, fontWeight: "900" },
  rateLabel: {
    color: theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
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
