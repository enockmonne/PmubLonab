import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchJson } from "./apiClient";
import { API_URL, theme } from "./theme";

type RaceSummary = {
  race_id: string;
  doc_type?: "programme" | "result";
  name?: string;
  date_text?: string;
  date_iso?: string;
  location?: string;
  meeting_label?: string;
  linked_programmes_count?: number;
  linked_results_count?: number;
  parse_quality?: { warnings?: string[] };
};

type HorseStats = { leaderboard?: { name: string }[] };

type DashboardData = {
  races: RaceSummary[];
  total: number;
  horseCount: number;
};

const QUICK_PATHS: {
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
}[] = [
  {
    label: "Rechercher",
    detail: "Cheval, course, jockey ou entraîneur",
    icon: "search-outline",
    route: "/(tabs)/archives",
  },
  {
    label: "Explorer les courses",
    detail: "Programmes, résultats et liens officiels",
    icon: "flag-outline",
    route: "/(tabs)/programmes",
  },
  {
    label: "Étudier les chevaux",
    detail: "Profils et apparitions historiques",
    icon: "people-outline",
    route: "/(tabs)/partants",
  },
  {
    label: "Comparer les sources",
    detail: "Couverture et écarts de sélection",
    icon: "newspaper-outline",
    route: "/(tabs)/pronostics",
  },
];

export default function AnalysisDashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({ races: [], total: 0, horseCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotice(null);
      const [racePayload, horsePayload] = await Promise.all([
        fetchJson<{ races?: RaceSummary[]; total?: number }>(`${API_URL}/api/races?limit=100`, {
          timeoutMs: 12000,
        }),
        fetchJson<HorseStats>(`${API_URL}/api/stats/horses`, { timeoutMs: 12000 }),
      ]);
      setData({
        races: racePayload.races || [],
        total: racePayload.total || 0,
        horseCount: horsePayload.leaderboard?.length || 0,
      });
    } catch (error) {
      console.error(error);
      setNotice("Impossible de charger le tableau de bord pour le moment.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const coverage = useMemo(() => {
    const programmes = data.races.filter((race) => (race.doc_type || "programme") === "programme");
    const results = data.races.filter((race) => race.doc_type === "result");
    const linked = programmes.filter((race) => (race.linked_results_count || 0) > 0).length;
    const toReview = data.races.filter((race) => {
      const unlinked =
        race.doc_type === "result"
          ? (race.linked_programmes_count || 0) === 0
          : (race.linked_results_count || 0) === 0;
      return unlinked || (race.parse_quality?.warnings?.length || 0) > 0;
    }).length;
    return { programmes: programmes.length, results: results.length, linked, toReview };
  }, [data.races]);

  const recent = useMemo(() => data.races.slice(0, 4), [data.races]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        testID="analysis-dashboard"
        contentContainerStyle={styles.content}
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
          <Text style={styles.overline}>PMU&apos;B/LONAB/Analysis</Text>
          <Text style={styles.title}>Tableau de bord</Text>
          <Text style={styles.lead}>
            Votre point de départ pour explorer le corpus, vérifier sa couverture et poursuivre une recherche historique.
          </Text>
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.gold} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <View style={styles.metrics}>
          <Metric label="Documents" value={data.total} icon="documents-outline" />
          <Metric label="Programmes" value={coverage.programmes} icon="newspaper-outline" />
          <Metric label="Paires liées" value={coverage.linked} icon="link-outline" />
          <Metric label="Chevaux suivis" value={data.horseCount} icon="people-outline" />
        </View>

        <TouchableOpacity
          style={styles.reviewCard}
          activeOpacity={0.86}
          onPress={() => router.push("/(tabs)/programmes")}
        >
          <View style={styles.reviewIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.gold} />
          </View>
          <View style={styles.reviewCopy}>
            <Text style={styles.reviewKicker}>Qualité du corpus</Text>
            <Text style={styles.reviewTitle}>
              {coverage.toReview} document{coverage.toReview === 1 ? "" : "s"} à vérifier
            </Text>
            <Text style={styles.reviewBody}>
              Documents non liés ou comportant des avertissements d&apos;extraction.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.gold} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>Parcours de recherche</Text>
          <Text style={styles.sectionTitle}>Que souhaitez-vous explorer ?</Text>
        </View>
        <View style={styles.quickGrid}>
          {QUICK_PATHS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickCard}
              activeOpacity={0.86}
              onPress={() => router.push(item.route)}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={item.icon} size={19} color={theme.colors.brand} />
              </View>
              <Text style={styles.quickTitle}>{item.label}</Text>
              <Text style={styles.quickDetail}>{item.detail}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>Activité récente</Text>
          <Text style={styles.sectionTitle}>Derniers documents importés</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.brand} />
        ) : recent.length ? (
          <View style={styles.recentList}>
            {recent.map((race) => (
              <TouchableOpacity
                key={race.race_id}
                style={styles.recentRow}
                activeOpacity={0.82}
                onPress={() => router.push(`/race/${race.race_id}?from=analysis-courses`)}
              >
                <View style={styles.docIcon}>
                  <Ionicons
                    name={race.doc_type === "result" ? "trophy-outline" : "document-text-outline"}
                    size={18}
                    color={theme.colors.brand}
                  />
                </View>
                <View style={styles.recentCopy}>
                  <Text style={styles.docType}>{race.doc_type === "result" ? "Résultat" : "Programme"}</Text>
                  <Text style={styles.recentTitle} numberOfLines={1}>{race.name || "Course sans titre"}</Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>
                    {[race.date_text || race.date_iso, race.meeting_label || race.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={28} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>Aucun document disponible</Text>
            <Text style={styles.emptyBody}>Importez un programme ou un résultat depuis l’administration Analysis.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.allCourses} onPress={() => router.push("/(tabs)/programmes")}>
          <Text style={styles.allCoursesText}>Voir toutes les courses</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.brand} />
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Informations historiques et explicables. Aucun contenu ne constitue une recommandation de pari.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={18} color={theme.colors.gold} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingBottom: 34 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  overline: { color: theme.colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 2.1, textTransform: "uppercase" },
  title: { marginTop: 7, color: theme.colors.brand, fontFamily: theme.fonts.serifBlack, fontSize: 38, lineHeight: 42, letterSpacing: -1 },
  lead: { marginTop: 9, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, maxWidth: 650 },
  notice: { marginHorizontal: 16, marginBottom: 14, padding: 12, flexDirection: "row", gap: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  noticeText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13, fontWeight: "700" },
  metrics: { paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "48%", minHeight: 112, padding: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  metricValue: { marginTop: 9, color: theme.colors.textPrimary, fontFamily: theme.fonts.serifBlack, fontSize: 28, lineHeight: 31 },
  metricLabel: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  reviewCard: { marginHorizontal: 16, marginTop: 12, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.brand },
  reviewIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  reviewCopy: { flex: 1 },
  reviewKicker: { color: theme.colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" },
  reviewTitle: { marginTop: 3, color: "#fff", fontSize: 17, fontWeight: "800" },
  reviewBody: { marginTop: 3, color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 17 },
  sectionHeader: { paddingHorizontal: 20, marginTop: 26, marginBottom: 12 },
  sectionKicker: { color: theme.colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.8, textTransform: "uppercase" },
  sectionTitle: { marginTop: 4, color: theme.colors.textPrimary, fontFamily: theme.fonts.serifBlack, fontSize: 24, lineHeight: 29 },
  quickGrid: { paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: { width: "48%", minHeight: 150, padding: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  quickIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  quickTitle: { marginTop: 13, color: theme.colors.textPrimary, fontSize: 15, fontWeight: "800" },
  quickDetail: { marginTop: 5, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
  loader: { paddingVertical: 28 },
  recentList: { marginHorizontal: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  recentRow: { minHeight: 76, paddingHorizontal: 13, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  docIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  recentCopy: { flex: 1 },
  docType: { color: theme.colors.gold, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  recentTitle: { marginTop: 2, color: theme.colors.textPrimary, fontSize: 14, fontWeight: "800" },
  recentMeta: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 11 },
  empty: { marginHorizontal: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  emptyTitle: { marginTop: 9, color: theme.colors.textPrimary, fontWeight: "800" },
  emptyBody: { marginTop: 5, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: "center" },
  allCourses: { marginHorizontal: 16, marginTop: 12, paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  allCoursesText: { color: theme.colors.brand, fontSize: 13, fontWeight: "800" },
  disclaimer: { marginHorizontal: 24, marginTop: 24, color: theme.colors.textSecondary, fontSize: 11, lineHeight: 17, textAlign: "center" },
});
