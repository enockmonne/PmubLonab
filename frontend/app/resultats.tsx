import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, API_URL, ADMIN_WEB_URL } from "../src/theme";
import { readCache, writeCache } from "../src/storageCache";

type ResultRace = {
  race_id: string;
  doc_type: string;
  name: string;
  event_type: string;
  date_text: string;
  date_iso: string;
  location: string;
  runners: number;
  finishing_order: number[];
  top_payout: { type: string; amount_fcfa: number; label: string } | null;
};

const RESULTS_CACHE_KEY = "pmub.resultats.v1";

export default function ResultatsScreen() {
  const [races, setRaces] = useState<ResultRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/races?has_results=true&limit=100`);
      const j = await r.json();
      const list: ResultRace[] = j.races || [];
      setRaces(list);
      writeCache(RESULTS_CACHE_KEY, list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    readCache<ResultRace[]>(RESULTS_CACHE_KEY).then((cached) => {
      if (!mounted || !cached) return;
      setRaces(cached);
      setLoading(false);
    });
    load();
    return () => {
      mounted = false;
    };
  }, [load]);

  const dateOptions = useMemo(() => {
    const seen = new Set<string>();
    return races
      .filter((race) => {
        if (!race.date_iso || seen.has(race.date_iso)) return false;
        seen.add(race.date_iso);
        return true;
      })
      .map((race) => ({
        date_iso: race.date_iso,
        date_text: race.date_text,
      }));
  }, [races]);

  const filteredRaces = useMemo(() => {
    if (!selectedDate) return races;
    return races.filter((race) => race.date_iso === selectedDate);
  }, [races, selectedDate]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="results-home-btn"
          onPress={() => router.push("/")}
          style={styles.homeBtn}
          hitSlop={10}
        >
          <Ionicons name="home-outline" size={18} color={theme.colors.brand} />
          <Text style={styles.homeText}>Accueil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.overline}>Après la course</Text>
        <Text style={styles.title}>Résultats officiels</Text>
        <Text style={styles.lead}>
          Ordre d&apos;arrivée officiel et rapports (Ordre, Désordre, Bonus,
          Couplé, Tiercé, Quarté+, Quinté+) en F CFA. Données importées depuis
          les PDF de courses ou de résultats.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand} />
      ) : (
        <FlatList
          testID="resultats-list"
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            dateOptions.length > 0 ? (
              <View style={styles.dateFilterWrap}>
                <Text style={styles.dateFilterLabel}>Choisir une date</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateFilterScroll}
                  testID="results-date-filter"
                >
                  <TouchableOpacity
                    testID="results-date-all"
                    onPress={() => setSelectedDate(null)}
                    style={[
                      styles.dateChip,
                      !selectedDate && styles.dateChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        !selectedDate && styles.dateChipTextActive,
                      ]}
                    >
                      Toutes
                    </Text>
                  </TouchableOpacity>
                  {dateOptions.map((date) => {
                    const active = selectedDate === date.date_iso;
                    return (
                      <TouchableOpacity
                        key={date.date_iso}
                        testID={`results-date-${date.date_iso}`}
                        onPress={() => setSelectedDate(date.date_iso)}
                        style={[styles.dateChip, active && styles.dateChipActive]}
                      >
                        <Text
                          style={[
                            styles.dateChipText,
                            active && styles.dateChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {date.date_text || date.date_iso}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={36} color={theme.colors.gold} />
              <Text style={styles.emptyTitle}>Aucun résultat publié</Text>
              <Text style={styles.emptyText}>
                Les résultats présents dans les PDF de courses ou les PDF de
                résultats importés via l&apos;admin apparaîtront ici.
              </Text>
              <TouchableOpacity
                testID="go-admin-empty"
                style={styles.adminBtn}
                onPress={() => Linking.openURL(ADMIN_WEB_URL)}
              >
                <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                <Text style={styles.adminBtnText}>Espace admin</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View
              testID={`result-card-${item.race_id}`}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.event_type || "Résultat"}</Text>
                </View>
                <Text style={styles.dateText}>{item.date_text}</Text>
              </View>
              <Text style={styles.raceName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.location}>
                <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                {"  "}
                {item.location}
              </Text>

              {/* Podium */}
              <View style={styles.podiumRow}>
                {item.finishing_order.slice(0, 5).map((n, idx) => (
                  <View
                    key={`${item.race_id}-${idx}`}
                    style={styles.podiumItem}
                  >
                    <Text style={styles.podiumNum}>{n}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                testID={`result-reports-${item.race_id}`}
                style={styles.ctaRow}
                onPress={() =>
                  router.push({
                    pathname: "/race/[race_id]",
                    params: { race_id: item.race_id, from: "resultats" },
                  })
                }
              >
                <Text style={styles.ctaText}>Voir tous les rapports</Text>
                <Ionicons name="arrow-forward" size={14} color={theme.colors.brand} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  headerBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  homeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  homeText: { fontSize: 13, fontWeight: "700", color: theme.colors.brand, marginLeft: 4 },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
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
  lead: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 17 },
  dateFilterWrap: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  dateFilterLabel: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  dateFilterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minWidth: 82,
    alignItems: "center",
  },
  dateChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  dateChipTextActive: {
    color: "#fff",
  },
  empty: { alignItems: "center", padding: 40, marginTop: 20 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
    maxWidth: 300,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: theme.colors.brand,
  },
  adminBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginTop: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.brand,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  raceName: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  location: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  podiumRow: { flexDirection: "row", gap: 6, marginTop: 14 },
  podiumItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  podiumNum: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.brand,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
