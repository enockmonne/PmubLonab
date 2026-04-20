import React, { useEffect, useState, useCallback } from "react";
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
import { theme, API_URL, formatFCFA } from "../src/theme";

type RaceSummary = {
  race_id: string;
  name: string;
  event_type: string;
  date_text: string;
  date_iso: string;
  location: string;
  runners: number;
  prize_fcfa: number;
  is_current: boolean;
  has_results: boolean;
};

type SearchResult = {
  races: { race_id: string; name: string; location: string; date_text: string }[];
  horses: { name: string; appearances: number; latest_race_id: string; latest_date: string }[];
  jockeys: { name: string; appearances: number }[];
  trainers: { name: string; appearances: number }[];
};

export default function ArchivesScreen() {
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [searchRes, setSearchRes] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/races?limit=50`);
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.overline}>Archives & Recherche</Text>
        <Text style={styles.title}>Toutes les courses</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
        <TextInput
          testID="global-search"
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Cheval, jockey, entraîneur, hippodrome..."
          placeholderTextColor={theme.colors.textSecondary}
        />
        {query.length > 0 && (
          <TouchableOpacity testID="clear-search" onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
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
          data={races}
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
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>
                Aucune course archivée. L&apos;admin peut importer des PDF via /admin.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`race-row-${item.race_id}`}
              style={styles.raceRow}
              onPress={() => router.push(`/race/${item.race_id}`)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.raceHeaderRow}>
                  <Text style={styles.raceName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.is_current && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Du jour</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.raceMeta}>
                  {item.date_text} • {item.location}
                </Text>
                <View style={styles.raceChips}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{item.runners} partants</Text>
                  </View>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{formatFCFA(item.prize_fcfa)}</Text>
                  </View>
                  {item.has_results && (
                    <View style={[styles.chip, styles.chipGold]}>
                      <Text style={[styles.chipText, { color: "#fff" }]}>Résultats</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
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
        <Text style={styles.emptyText}>Aucun résultat</Text>
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
            <SearchSection title="Entraîneurs">
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
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  search: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, marginLeft: 6 },
  sep: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: 16 },
  empty: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  raceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  raceHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  raceName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  currentBadge: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  raceMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  raceChips: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  chipGold: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: "600" },
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
