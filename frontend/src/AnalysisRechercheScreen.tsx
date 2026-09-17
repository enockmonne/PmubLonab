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
import { Href, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL, theme } from "./theme";

type RaceSummary = {
  race_id: string;
  doc_type?: "programme" | "result";
  name: string;
  date_text?: string;
  date_iso?: string;
  location?: string;
  meeting_label?: string;
  event_type?: string;
  race_type?: string;
  runners?: number;
  has_results?: boolean;
  linked_results_count?: number;
  linked_programmes_count?: number;
};

type SearchResult = {
  races: { race_id: string; name: string; location: string; date_text: string }[];
  horses: { name: string; appearances: number; latest_race_id: string; latest_date: string }[];
  jockeys: { name: string; appearances: number }[];
  trainers: { name: string; appearances: number }[];
};

type QuickPath = {
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
};

const QUICK_PATHS: QuickPath[] = [
  {
    label: "Chevaux",
    detail: "Profils, dernieres sorties et historique.",
    icon: "people-outline",
    route: "/(tabs)/partants",
  },
  {
    label: "Courses",
    detail: "Programmes, resultats et liens officiels.",
    icon: "flag-outline",
    route: "/(tabs)/programmes",
  },
  {
    label: "Sources",
    detail: "Pronostics, medias et ecarts de selection.",
    icon: "newspaper-outline",
    route: "/(tabs)/pronostics",
  },
  {
    label: "Analyses",
    detail: "Couverture, stats et signaux historiques.",
    icon: "stats-chart-outline",
    route: "/(tabs)/stats",
  },
];

export default function AnalysisRechercheScreen() {
  const router = useRouter();
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [query, setQuery] = useState("");
  const [searchRes, setSearchRes] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotice(null);
      const response = await fetch(`${API_URL}/api/races?limit=30`);
      const payload = await response.json();
      setRaces(payload.races || []);
    } catch (error) {
      console.error(error);
      setNotice("Connexion lente - impossible de charger les documents recents.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchRes(null);
      setSearching(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(trimmed)}`);
        const payload = await response.json();
        setSearchRes(payload);
      } catch (error) {
        console.error(error);
        setSearchRes(null);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const counts = useMemo(() => {
    return races.reduce(
      (acc, race) => {
        acc.total += 1;
        if ((race.doc_type || "programme") === "result") acc.results += 1;
        else acc.programmes += 1;
        if ((race.linked_results_count || 0) > 0 || (race.linked_programmes_count || 0) > 0) {
          acc.linked += 1;
        }
        return acc;
      },
      { total: 0, programmes: 0, results: 0, linked: 0 }
    );
  }, [races]);

  const hasQuery = query.trim().length >= 2;
  const recentRaces = races.slice(0, 8);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={hasQuery ? [] : recentRaces}
        keyExtractor={(item) => item.race_id}
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
              <Text style={styles.overline}>PMU&apos;B/LONAB/Analysis</Text>
              <Text style={styles.title}>Recherche</Text>
              <Text style={styles.lead}>
                Explorez les chevaux, courses, sources et resultats deja extraits des PDF officiels.
              </Text>
            </View>

            <View style={styles.searchPanel}>
              <Text style={styles.searchLabel}>Recherche historique</Text>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={17} color={theme.colors.textSecondary} />
                <TextInput
                  testID="analysis-search"
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchInput}
                  placeholder="Cheval, jockey, entraineur, source, course..."
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCorrect={false}
                />
                {query.length > 0 ? (
                  <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.searchHint}>
                Entrez au moins 2 caracteres. Les resultats restent des indices de recherche, pas des conseils de pari.
              </Text>
            </View>

            {notice ? (
              <View style={styles.notice}>
                <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.gold} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            {!hasQuery ? (
              <>
                <View style={styles.metricsGrid}>
                  <MetricCard label="Documents" value={counts.total} icon="albums-outline" />
                  <MetricCard label="Programmes" value={counts.programmes} icon="newspaper-outline" />
                  <MetricCard label="Resultats" value={counts.results} icon="trophy-outline" />
                  <MetricCard label="Lies" value={counts.linked} icon="git-compare-outline" />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionKicker}>Parcours rapides</Text>
                  <Text style={styles.sectionTitle}>Commencer une recherche</Text>
                  <View style={styles.quickGrid}>
                    {QUICK_PATHS.map((item) => (
                      <TouchableOpacity
                        key={item.label}
                        style={styles.quickCard}
                        activeOpacity={0.85}
                        onPress={() => router.push(item.route)}
                      >
                        <View style={styles.quickIcon}>
                          <Ionicons name={item.icon} size={18} color={theme.colors.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.quickLabel}>{item.label}</Text>
                          <Text style={styles.quickDetail}>{item.detail}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.listIntro}>
                  <Text style={styles.sectionKicker}>Corpus recent</Text>
                  <Text style={styles.sectionTitle}>Derniers documents</Text>
                </View>
              </>
            ) : (
              <SearchResults
                data={searchRes}
                loading={searching}
                onOpenHorse={(name) => router.push(`/horse-history/${encodeURIComponent(name)}`)}
                onOpenRace={(id) => router.push(`/race/${id}`)}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          !hasQuery && !loading ? (
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>Aucun document recent disponible.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <RecentRaceRow item={item} onPress={() => router.push(`/race/${item.race_id}`)} />}
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

function MetricCard({
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

function RecentRaceRow({ item, onPress }: { item: RaceSummary; onPress: () => void }) {
  const docType = item.doc_type || "programme";
  const linked = (item.linked_results_count || 0) > 0 || (item.linked_programmes_count || 0) > 0;

  return (
    <TouchableOpacity style={styles.raceRow} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowTop}>
        <View style={[styles.docBadge, docType === "result" && styles.docBadgeResult]}>
          <Text style={[styles.docBadgeText, docType === "result" && styles.docBadgeTextResult]}>
            {docType === "result" ? "Resultat" : "Programme"}
          </Text>
        </View>
        <Text style={styles.rowDate}>{item.date_text || item.date_iso || "Date non renseignee"}</Text>
      </View>
      <Text style={styles.raceName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.raceMeta} numberOfLines={1}>
        {[item.meeting_label || item.location, item.event_type, item.race_type].filter(Boolean).join(" - ")}
      </Text>
      <View style={styles.raceFooter}>
        <Text style={styles.coverageText}>
          {linked ? "Programme/resultat lie" : docType === "result" ? "Resultat seul" : "Resultat a lier"}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.brand} />
      </View>
    </TouchableOpacity>
  );
}

function SearchResults({
  data,
  loading,
  onOpenHorse,
  onOpenRace,
}: {
  data: SearchResult | null;
  loading: boolean;
  onOpenHorse: (name: string) => void;
  onOpenRace: (id: string) => void;
}) {
  if (loading && !data) {
    return <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.brand} />;
  }

  if (!data) return null;

  const hasAny =
    data.horses.length + data.races.length + data.jockeys.length + data.trainers.length > 0;

  if (!hasAny) {
    return (
      <View style={styles.empty}>
        <Ionicons name="search-outline" size={32} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>Aucun resultat pour cette recherche.</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionKicker}>Resultats</Text>
      <Text style={styles.sectionTitle}>Pistes de recherche</Text>
      {data.horses.length > 0 ? (
        <ResultGroup title="Chevaux">
          {data.horses.map((item) => (
            <SearchRow
              key={`horse-${item.name}`}
              icon="ribbon-outline"
              title={item.name}
              meta={`${item.appearances} apparition${item.appearances > 1 ? "s" : ""}`}
              onPress={() => onOpenHorse(item.name)}
            />
          ))}
        </ResultGroup>
      ) : null}
      {data.races.length > 0 ? (
        <ResultGroup title="Courses">
          {data.races.map((item) => (
            <SearchRow
              key={`race-${item.race_id}`}
              icon="flag-outline"
              title={item.name}
              meta={`${item.date_text || ""} - ${item.location || ""}`}
              onPress={() => onOpenRace(item.race_id)}
            />
          ))}
        </ResultGroup>
      ) : null}
      {data.jockeys.length > 0 ? (
        <ResultGroup title="Jockeys">
          {data.jockeys.map((item) => (
            <SearchRow
              key={`jockey-${item.name}`}
              icon="person-outline"
              title={item.name}
              meta={`${item.appearances} apparition${item.appearances > 1 ? "s" : ""}`}
            />
          ))}
        </ResultGroup>
      ) : null}
      {data.trainers.length > 0 ? (
        <ResultGroup title="Entraineurs">
          {data.trainers.map((item) => (
            <SearchRow
              key={`trainer-${item.name}`}
              icon="briefcase-outline"
              title={item.name}
              meta={`${item.appearances} partant${item.appearances > 1 ? "s" : ""}`}
            />
          ))}
        </ResultGroup>
      ) : null}
    </View>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.resultGroup}>
      <Text style={styles.resultGroupTitle}>{title}</Text>
      <View style={styles.resultGroupBody}>{children}</View>
    </View>
  );
}

function SearchRow({
  icon,
  title,
  meta,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  onPress?: () => void;
}) {
  const RowRoot = onPress ? TouchableOpacity : View;

  return (
    <RowRoot style={styles.searchRow} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={18} color={theme.colors.brand} />
      <View style={{ flex: 1 }}>
        <Text style={styles.searchRowTitle}>{title}</Text>
        <Text style={styles.searchRowMeta}>{meta}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} /> : null}
    </RowRoot>
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
  searchPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 10,
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
  searchHint: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
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
  section: { paddingHorizontal: 16, paddingTop: 18 },
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
  quickGrid: { gap: 10, marginTop: 10 },
  quickCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    padding: 12,
  },
  quickIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  quickLabel: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  quickDetail: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
  listIntro: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  raceRow: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 13,
  },
  rowTop: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 8 },
  docBadge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  docBadgeResult: { backgroundColor: "#FBF7EC", borderColor: theme.colors.gold },
  docBadgeText: {
    color: theme.colors.brand,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  docBadgeTextResult: { color: theme.colors.gold },
  rowDate: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: "700" },
  raceName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  raceMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  raceFooter: {
    alignItems: "center",
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
  },
  coverageText: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
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
  resultGroup: { marginTop: 12 },
  resultGroupTitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  resultGroupBody: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  searchRow: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchRowTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: "800" },
  searchRowMeta: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
});
