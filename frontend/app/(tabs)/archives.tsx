import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, API_URL, formatFCFA, formatEuro } from "../../src/theme";

type RaceSummary = {
  race_id: string;
  doc_type?: "programme" | "result";
  name: string;
  event_type: string;
  meeting_label?: string;
  course_label?: string;
  race_type?: string;
  start_mode?: string;
  date_text: string;
  date_iso: string;
  location: string;
  runners: number;
  prize_euros?: number;
  prize_fcfa: number;
  is_current: boolean;
  has_results: boolean;
  linked_results_count?: number;
  linked_programmes_count?: number;
  finishing_order?: number[];
  top_payout?: { type?: string; amount_fcfa?: number; label?: string } | null;
};

type SearchResult = {
  races: { race_id: string; name: string; location: string; date_text: string }[];
  horses: { name: string; appearances: number; latest_race_id: string; latest_date: string }[];
  jockeys: { name: string; appearances: number }[];
  trainers: { name: string; appearances: number }[];
};

type ArchiveFilter = "all" | "programmes" | "results" | "linked" | "missing";

const FILTERS: { key: ArchiveFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "Tous", icon: "albums-outline" },
  { key: "programmes", label: "Programmes", icon: "newspaper-outline" },
  { key: "results", label: "Resultats", icon: "trophy-outline" },
  { key: "linked", label: "Avec rapports", icon: "link-outline" },
  { key: "missing", label: "A completer", icon: "alert-circle-outline" },
];

export default function ArchivesScreen() {
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [searchRes, setSearchRes] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<ArchiveFilter>("all");
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/races?limit=100`);
      const j = await r.json();
      setRaces(j.races || []);
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

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchRes(null);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query.trim())}`);
        const j = await r.json();
        setSearchRes(j);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const filteredRaces = useMemo(() => {
    return races.filter((race) => {
      const docType = race.doc_type || "programme";
      if (filter === "programmes") return docType === "programme";
      if (filter === "results") return docType === "result";
      if (filter === "linked") {
        return Boolean(
          race.has_results ||
            (race.linked_results_count || 0) > 0 ||
            (race.linked_programmes_count || 0) > 0,
        );
      }
      if (filter === "missing") {
        return docType === "programme" && !race.has_results && (race.linked_results_count || 0) === 0;
      }
      return true;
    });
  }, [filter, races]);

  const programmeCount = races.filter((race) => (race.doc_type || "programme") === "programme").length;
  const resultCount = races.filter((race) => race.doc_type === "result").length;
  const linkedCount = races.filter(
    (race) => race.has_results || (race.linked_results_count || 0) > 0 || (race.linked_programmes_count || 0) > 0,
  ).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.overline}>Archives & Recherche</Text>
        <Text style={styles.title}>Recherche</Text>
        <Text style={styles.headerLead}>
          Retrouvez une course, un cheval, un jockey ou un ancien rapport sans connaitre la date exacte.
        </Text>
      </View>

      <View style={styles.snapshotRow}>
        <ArchiveMetric value={programmeCount} label="programmes" />
        <ArchiveMetric value={resultCount} label="resultats" />
        <ArchiveMetric value={linkedCount} label="avec rapports" />
      </View>

      <View style={styles.searchPanel}>
        <Text style={styles.searchLabel}>Recherche rapide</Text>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
          <TextInput
            testID="global-search"
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Cheval, jockey, entraineur, hippodrome..."
            placeholderTextColor={theme.colors.textSecondary}
          />
          {query.length > 0 && (
            <TouchableOpacity testID="clear-search" onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.searchHint}>Essayez un nom de cheval, une ville, un jockey ou une course.</Text>
      </View>

      <View style={styles.filterWrap}>
        {FILTERS.map((item) => (
          <TouchableOpacity
            key={item.key}
            testID={`archive-filter-${item.key}`}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={item.icon}
              size={14}
              color={filter === item.key ? "#fff" : theme.colors.brand}
            />
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand} />
      ) : query.trim().length >= 2 ? (
        <SearchResultsView
          data={searchRes}
          loading={searching}
          onOpenRace={(id) => router.push(`/race/${id}`)}
          onOpenHorse={(name) => router.push(`/horse-history/${encodeURIComponent(name)}`)}
        />
      ) : (
        <FlatList
          testID="archives-list"
          data={filteredRaces}
          keyExtractor={(r) => r.race_id}
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
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={styles.listIntro}>
              <Text style={styles.listOverline}>Historique</Text>
              <Text style={styles.listTitle}>{filterTitle(filter)}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>Aucun element pour ce filtre.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ArchiveRaceRow item={item} onPress={() => router.push(`/race/${item.race_id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function filterTitle(filter: ArchiveFilter) {
  if (filter === "programmes") return "Programmes archives";
  if (filter === "results") return "Resultats officiels";
  if (filter === "linked") return "Courses avec rapports";
  if (filter === "missing") return "Programmes a completer";
  return "Documents recents";
}

function ArchiveMetric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.archiveMetric}>
      <Text style={styles.archiveMetricValue}>{value}</Text>
      <Text style={styles.archiveMetricLabel}>{label}</Text>
    </View>
  );
}

function ArchiveRaceRow({ item, onPress }: { item: RaceSummary; onPress: () => void }) {
  const docType = item.doc_type || "programme";
  const isResult = docType === "result";
  const hasLinkedResults = (item.linked_results_count || 0) > 0;
  const hasLinkedProgrammes = (item.linked_programmes_count || 0) > 0;
  const statusLabel = isResult
    ? hasLinkedProgrammes
      ? "Programme lie"
      : "Resultat seul"
    : item.has_results || hasLinkedResults
      ? "Rapports disponibles"
      : "Rapports manquants";
  const arrival = (item.finishing_order || []).slice(0, 5).join(" - ");

  return (
    <TouchableOpacity
      testID={`race-row-${item.race_id}`}
      style={styles.raceRow}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.rowTop}>
        <View style={[styles.docBadge, isResult && styles.docBadgeResult]}>
          <Text style={[styles.docBadgeText, isResult && styles.docBadgeTextResult]}>
            {isResult ? "Resultat" : "Programme"}
          </Text>
        </View>
        {item.is_current && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Du jour</Text>
          </View>
        )}
      </View>

      <Text style={styles.raceName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.raceMeta}>
        {item.date_text} • {item.meeting_label || item.location}
      </Text>
      <Text style={styles.raceContext} numberOfLines={2}>
        {[item.event_type, item.meeting_label, item.race_type, item.course_label, item.start_mode]
          .filter(Boolean)
          .join(" • ")}
      </Text>

      {isResult && arrival ? (
        <Text style={styles.arrivalLine} numberOfLines={1}>
          Arrivee officielle: {arrival}
        </Text>
      ) : null}

      <View style={styles.raceChips}>
        {!isResult ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.runners || 0} partants</Text>
          </View>
        ) : null}
        {item.prize_euros ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{formatEuro(item.prize_euros)}</Text>
          </View>
        ) : null}
        {!isResult && item.prize_fcfa ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>Env. {formatFCFA(item.prize_fcfa)}</Text>
          </View>
        ) : null}
        {item.top_payout?.amount_fcfa ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>Ordre {formatFCFA(item.top_payout.amount_fcfa)}</Text>
          </View>
        ) : null}
        <View
          style={[
            styles.chip,
            item.has_results || hasLinkedResults || hasLinkedProgrammes
              ? styles.chipReady
              : styles.chipMissing,
          ]}
        >
          <Text style={styles.chipText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.openRow}>
        <Text style={styles.openText}>Ouvrir le dossier</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.brand} />
      </View>
    </TouchableOpacity>
  );
}

function SearchResultsView({
  data,
  loading,
  onOpenRace,
  onOpenHorse,
}: {
  data: SearchResult | null;
  loading: boolean;
  onOpenRace: (id: string) => void;
  onOpenHorse: (name: string) => void;
}) {
  if (loading && !data) {
    return <ActivityIndicator style={{ marginTop: 30 }} color={theme.colors.brand} />;
  }
  if (!data) return null;
  const hasAny =
    data.races.length + data.horses.length + data.jockeys.length + data.trainers.length > 0;

  if (!hasAny) {
    return (
      <View style={styles.empty} testID="search-empty">
        <Ionicons name="search" size={32} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>Aucun resultat</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="search-results"
      data={[]}
      renderItem={null}
      keyExtractor={() => ""}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {data.horses.length > 0 && (
            <SearchSection title="Chevaux">
              {data.horses.map((h) => (
                <TouchableOpacity
                  key={`h-${h.name}`}
                  testID={`search-horse-${h.name}`}
                  style={styles.searchRow}
                  onPress={() => onOpenHorse(h.name)}
                >
                  <Ionicons name="ribbon-outline" size={18} color={theme.colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchName}>{h.name}</Text>
                    <Text style={styles.searchMeta}>
                      {h.appearances} course{h.appearances > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </SearchSection>
          )}

          {data.races.length > 0 && (
            <SearchSection title="Courses">
              {data.races.map((r) => (
                <TouchableOpacity
                  key={`r-${r.race_id}`}
                  style={styles.searchRow}
                  onPress={() => onOpenRace(r.race_id)}
                >
                  <Ionicons name="newspaper-outline" size={18} color={theme.colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchName}>{r.name}</Text>
                    <Text style={styles.searchMeta}>
                      {r.date_text} • {r.location}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </SearchSection>
          )}

          {data.jockeys.length > 0 && (
            <SearchSection title="Jockeys">
              {data.jockeys.map((j) => (
                <View key={`j-${j.name}`} style={styles.searchRow}>
                  <Ionicons name="person-outline" size={18} color={theme.colors.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchName}>{j.name}</Text>
                    <Text style={styles.searchMeta}>
                      {j.appearances} monte{j.appearances > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </SearchSection>
          )}

          {data.trainers.length > 0 && (
            <SearchSection title="Entraineurs">
              {data.trainers.map((t) => (
                <View key={`t-${t.name}`} style={styles.searchRow}>
                  <Ionicons name="briefcase-outline" size={18} color={theme.colors.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchName}>{t.name}</Text>
                    <Text style={styles.searchMeta}>
                      {t.appearances} partant{t.appearances > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </SearchSection>
          )}
        </View>
      }
    />
  );
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.searchSectionTitle}>{title}</Text>
      <View style={styles.searchSectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  overline: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerLead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  snapshotRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  archiveMetric: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  archiveMetricValue: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  archiveMetricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 2,
    textAlign: "center",
  },
  searchPanel: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchLabel: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  search: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    marginLeft: 2,
  },
  searchHint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginTop: 8,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brand,
  },
  filterText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  filterTextActive: { color: "#fff" },
  listIntro: { marginBottom: 10 },
  listOverline: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  listTitle: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: "900",
    marginTop: 2,
  },
  sep: { height: 10 },
  empty: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  raceRow: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  docBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  docBadgeResult: {
    borderColor: theme.colors.gold,
    backgroundColor: "#FBF7EC",
  },
  docBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: theme.colors.brand,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  docBadgeTextResult: { color: theme.colors.gold },
  currentBadge: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  raceName: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  raceMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  raceContext: {
    fontSize: 11,
    color: theme.colors.brand,
    fontWeight: "800",
    marginTop: 5,
    textTransform: "uppercase",
  },
  arrivalLine: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    marginTop: 8,
  },
  raceChips: { flexDirection: "row", gap: 6, marginTop: 9, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  chipReady: { borderColor: theme.colors.gold, backgroundColor: "#FBF7EC" },
  chipMissing: { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
  chipText: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: "700" },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  openText: {
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.brand,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  searchSectionTitle: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  searchSectionBody: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  searchName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  searchMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
});
