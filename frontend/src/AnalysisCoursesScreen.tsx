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
import { API_URL, formatFCFA, theme } from "./theme";

type Coverage = "all" | "linked" | "programme_only" | "result_only";

type ParseQuality = { warnings?: string[] };

type RaceSummary = {
  race_id: string;
  doc_type: "programme" | "result";
  name: string;
  date_text?: string;
  date_iso?: string;
  location?: string;
  meeting_label?: string;
  race_type?: string;
  discipline?: string;
  distance_m?: number;
  runners?: number;
  linked_programme_ids?: string[];
  linked_result_ids?: string[];
  linked_programmes_count?: number;
  linked_results_count?: number;
  finishing_order?: number[];
  top_payout?: { type?: string; amount_fcfa?: number; label?: string } | null;
  parse_quality?: ParseQuality;
};

type RaceGroup = {
  key: string;
  programme?: RaceSummary;
  result?: RaceSummary;
};

const COVERAGE: { key: Coverage; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "linked", label: "Liés" },
  { key: "programme_only", label: "Programme seul" },
  { key: "result_only", label: "Résultat seul" },
];

export default function AnalysisCoursesScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<RaceSummary[]>([]);
  const [query, setQuery] = useState("");
  const [coverage, setCoverage] = useState<Coverage>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotice(null);
      const params = new URLSearchParams({ limit: "500" });
      if (coverage !== "all") params.set("linkage_state", coverage);
      const payload = await fetchJson<{ races?: RaceSummary[] }>(
        `${API_URL}/api/races?${params.toString()}`,
        { timeoutMs: 12000 },
      );
      setDocuments(payload.races || []);
    } catch (error) {
      console.error(error);
      setNotice("Impossible de charger les courses historiques pour le moment.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coverage]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const groups = useMemo(() => groupDocuments(documents), [documents]);
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr");
    if (!value) return groups;
    return groups.filter(({ programme, result }) =>
      [programme, result].some((document) =>
        [document?.name, document?.location, document?.meeting_label, document?.race_type]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(value),
      ),
    );
  }, [groups, query]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        testID="analysis-courses-list"
        data={filtered}
        keyExtractor={(item) => item.key}
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
              <Text style={styles.overline}>Exploration historique</Text>
              <Text style={styles.title}>Courses</Text>
              <Text style={styles.lead}>
                Programmes, arrivées officielles et provenance des documents déjà importés.
              </Text>
            </View>

            <View style={styles.searchPanel}>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={17} color={theme.colors.textSecondary} />
                <TextInput
                  testID="analysis-courses-search"
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchInput}
                  placeholder="Course, hippodrome ou discipline..."
                  placeholderTextColor={theme.colors.textSecondary}
                />
                {query ? (
                  <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.filters}>
                {COVERAGE.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    testID={`analysis-courses-filter-${item.key}`}
                    onPress={() => setCoverage(item.key)}
                    style={[styles.filter, coverage === item.key && styles.filterActive]}
                  >
                    <Text style={[styles.filterText, coverage === item.key && styles.filterTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Corpus disponible</Text>
              <Text style={styles.resultCount}>{filtered.length} course{filtered.length === 1 ? "" : "s"}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={theme.colors.brand} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="documents-outline" size={28} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>Aucune course trouvée</Text>
              <Text style={styles.emptyBody}>
                Modifiez les filtres ou importez des documents depuis l’administration Analysis.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <RaceCard
            group={item}
            onPress={() => {
              const primary = item.programme || item.result;
              if (primary) router.push(`/race/${primary.race_id}?from=analysis-courses`);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

function groupDocuments(documents: RaceSummary[]): RaceGroup[] {
  const byId = new Map(documents.map((document) => [document.race_id, document]));
  const groups = new Map<string, RaceGroup>();

  for (const document of documents) {
    const programmeId =
      document.doc_type === "programme"
        ? document.race_id
        : document.linked_programme_ids?.[0];
    const key = programmeId || document.race_id;
    const group = groups.get(key) || { key };
    if (document.doc_type === "programme") group.programme = document;
    else group.result = document;

    if (!group.programme && programmeId) group.programme = byId.get(programmeId);
    const resultId = group.programme?.linked_result_ids?.[0];
    if (!group.result && resultId) group.result = byId.get(resultId);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => {
    const aDate = a.programme?.date_iso || a.result?.date_iso || "";
    const bDate = b.programme?.date_iso || b.result?.date_iso || "";
    return bDate.localeCompare(aDate);
  });
}

function RaceCard({ group, onPress }: { group: RaceGroup; onPress: () => void }) {
  const primary = group.programme || group.result;
  if (!primary) return null;
  const result = group.result;
  const linked = Boolean(group.programme && group.result);
  const warnings = [
    ...(group.programme?.parse_quality?.warnings || []),
    ...(group.result?.parse_quality?.warnings || []),
  ];
  const context = [primary.race_type || primary.discipline, primary.distance_m ? `${primary.distance_m} m` : ""]
    .filter(Boolean)
    .join(" • ");

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.86}>
      <View style={styles.badges}>
        {group.programme ? <Badge label="Programme" tone="brand" /> : null}
        {group.result ? <Badge label="Résultat" tone="gold" /> : null}
        {linked ? <Badge label="Liés" tone="neutral" /> : null}
      </View>
      <Text style={styles.cardTitle}>{group.programme?.name || group.result?.name}</Text>
      <Text style={styles.cardMeta}>
        {[primary.date_text || primary.date_iso, primary.meeting_label || primary.location]
          .filter(Boolean)
          .join(" • ")}
      </Text>
      {context ? <Text style={styles.cardContext}>{context}</Text> : null}

      {result?.finishing_order?.length ? (
        <View style={styles.arrival}>
          <Text style={styles.arrivalLabel}>Arrivée officielle</Text>
          <Text style={styles.arrivalValue}>{result.finishing_order.join(" - ")}</Text>
        </View>
      ) : (
        <Text style={styles.missing}>Aucun résultat officiel lié.</Text>
      )}

      {result?.top_payout?.amount_fcfa ? (
        <Text style={styles.payout}>
          {result.top_payout.type || "Rapport"} · {formatFCFA(result.top_payout.amount_fcfa)}
        </Text>
      ) : null}
      {warnings.length ? (
        <View style={styles.warningRow}>
          <Ionicons name="alert-circle-outline" size={15} color={theme.colors.gold} />
          <Text style={styles.warningText}>{warnings.length} point{warnings.length > 1 ? "s" : ""} à vérifier</Text>
        </View>
      ) : null}
      <View style={styles.openRow}>
        <Text style={styles.openText}>Ouvrir le dossier</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.brand} />
      </View>
    </TouchableOpacity>
  );
}

function Badge({ label, tone }: { label: string; tone: "brand" | "gold" | "neutral" }) {
  return (
    <View style={[styles.badge, tone === "brand" && styles.badgeBrand, tone === "gold" && styles.badgeGold]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { paddingTop: 18, paddingBottom: 16 },
  overline: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: theme.colors.gold, fontWeight: "800" },
  title: { fontFamily: theme.fonts.serifBlack, fontSize: 38, color: theme.colors.textPrimary, marginTop: 4 },
  lead: { fontSize: 14, lineHeight: 21, color: theme.colors.textSecondary, marginTop: 6, maxWidth: 620 },
  searchPanel: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 12 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg, paddingHorizontal: 12 },
  searchInput: { flex: 1, minHeight: 44, color: theme.colors.textPrimary, fontSize: 14 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  filter: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
  filterActive: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brand },
  filterText: { fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary },
  filterTextActive: { color: "#fff" },
  notice: { marginTop: 12, color: theme.colors.gold, fontSize: 12 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 22, marginBottom: 10 },
  resultTitle: { fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary },
  resultCount: { fontSize: 12, color: theme.colors.textSecondary },
  loader: { marginTop: 44 },
  empty: { alignItems: "center", padding: 32, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: theme.colors.textPrimary, marginTop: 10 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center", color: theme.colors.textSecondary, marginTop: 5 },
  card: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 15 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
  badgeBrand: { borderColor: theme.colors.brand },
  badgeGold: { borderColor: theme.colors.gold },
  badgeText: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1, fontWeight: "800", color: theme.colors.textSecondary },
  cardTitle: { fontSize: 18, lineHeight: 23, fontWeight: "900", color: theme.colors.textPrimary },
  cardMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 5 },
  cardContext: { fontSize: 11, color: theme.colors.brand, fontWeight: "800", textTransform: "uppercase", marginTop: 7 },
  arrival: { marginTop: 13, padding: 10, backgroundColor: theme.colors.surfaceAlt, borderLeftWidth: 3, borderLeftColor: theme.colors.gold },
  arrivalLabel: { fontSize: 9, color: theme.colors.textSecondary, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  arrivalValue: { fontSize: 18, color: theme.colors.textPrimary, fontWeight: "900", marginTop: 3 },
  missing: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 12, fontStyle: "italic" },
  payout: { fontSize: 12, color: theme.colors.textPrimary, fontWeight: "700", marginTop: 8 },
  warningRow: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 10 },
  warningText: { fontSize: 11, color: theme.colors.gold, fontWeight: "700" },
  openRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  openText: { fontSize: 12, color: theme.colors.brand, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
});
