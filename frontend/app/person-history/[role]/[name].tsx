import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchJson } from "../../../src/apiClient";
import { API_URL, theme } from "../../../src/theme";

type Role = "jockey" | "trainer";
type Filter = "all" | "evaluated" | "pending";

type Appearance = {
  race_id: string;
  race_name?: string;
  date_iso?: string;
  date_text?: string;
  location?: string;
  discipline?: string;
  distance_m?: number;
  horse_name?: string;
  horse_number?: number | null;
  finishing_position?: number | null;
  result_status: "evaluated" | "missing_official_result";
};

type PersonProfile = {
  role: Role;
  name: string;
  aliases: string[];
  stats: {
    total_appearances: number;
    races: number;
    horses: number;
    evaluated_appearances: number;
    wins: number;
    top3: number;
    coverage_rate: number;
  };
  appearances: Appearance[];
  methodology: string;
};

export default function PersonHistoryScreen() {
  const params = useLocalSearchParams<{ role: string; name: string }>();
  const role: Role = params.role === "trainer" ? "trainer" : "jockey";
  const name = decodeURIComponent(String(params.name || ""));
  const router = useRouter();
  const [data, setData] = useState<PersonProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await fetchJson<PersonProfile>(
          `${API_URL}/api/stats/people/${role}/${encodeURIComponent(name)}`,
          { timeoutMs: 12000 },
        );
        if (active) setData(profile);
      } catch (error) {
        console.error(error);
        if (active) setNotice("Aucun historique disponible pour cette personne.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [name, role]);

  const visible = useMemo(() => (data?.appearances || []).filter((appearance) => {
    if (filter === "evaluated") return appearance.result_status === "evaluated";
    if (filter === "pending") return appearance.result_status !== "evaluated";
    return true;
  }), [data, filter]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={21} color={theme.colors.brand} />
          <Text style={styles.backText}>Recherche</Text>
        </TouchableOpacity>
      </View>
      {!data ? (
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={34} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Profil indisponible</Text>
          <Text style={styles.body}>{notice}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} testID="person-history-screen">
          <View style={styles.identity}>
            <View style={styles.identityIcon}>
              <Ionicons name={role === "jockey" ? "walk-outline" : "briefcase-outline"} size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.overline}>{role === "jockey" ? "Historique jockey" : "Historique entraîneur"}</Text>
              <Text style={styles.title}>{data.name}</Text>
            </View>
          </View>
          <Text style={styles.lead}>
            Apparitions observées dans les programmes importés et résultats officiels reliés.
          </Text>

          <View style={styles.metrics}>
            <Metric label="Apparitions" value={data.stats.total_appearances} />
            <Metric label="Courses" value={data.stats.races} />
            <Metric label="Chevaux" value={data.stats.horses} />
            <Metric label="Couverture" value={`${data.stats.coverage_rate} %`} />
          </View>

          <View style={styles.coverageNotice}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.coverageText}>
              {data.stats.evaluated_appearances} apparition{data.stats.evaluated_appearances === 1 ? "" : "s"} avec résultat officiel relié · {data.stats.top3} top 3 observé{data.stats.top3 === 1 ? "" : "s"}.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Courses et chevaux associés</Text>
            <View style={styles.filters}>
              <FilterChip label="Toutes" active={filter === "all"} onPress={() => setFilter("all")} />
              <FilterChip label="Évaluées" active={filter === "evaluated"} onPress={() => setFilter("evaluated")} />
              <FilterChip label="En attente" active={filter === "pending"} onPress={() => setFilter("pending")} />
            </View>
            <Text style={styles.resultCount}>{visible.length} apparition{visible.length === 1 ? "" : "s"}</Text>
            {visible.map((appearance, index) => (
              <TouchableOpacity
                key={`${appearance.race_id}-${appearance.horse_number}-${index}`}
                style={styles.row}
                onPress={() => router.push(`/race/${appearance.race_id}?from=analysis-search`)}
                activeOpacity={0.84}
              >
                <View style={styles.horseNumber}>
                  <Text style={styles.horseNumberText}>{appearance.horse_number || "–"}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.horseName}>{appearance.horse_name || "Cheval non renseigné"}</Text>
                  <Text style={styles.raceName}>{appearance.race_name || "Course sans titre"}</Text>
                  <Text style={styles.meta}>
                    {[appearance.date_text || appearance.date_iso, appearance.location, appearance.discipline]
                      .filter(Boolean)
                      .join(" • ")}
                  </Text>
                </View>
                <View style={styles.finishBox}>
                  <Text style={styles.finishValue}>{appearance.finishing_position ? `${appearance.finishing_position}e` : "—"}</Text>
                  <Text style={styles.finishLabel}>Arrivée</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.methodology}>
            <Ionicons name="shield-checkmark-outline" size={17} color={theme.colors.brand} />
            <Text style={styles.methodologyText}>{data.methodology}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  loader: { alignItems: "center", backgroundColor: theme.colors.bg, flex: 1, justifyContent: "center" },
  nav: { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  back: { alignItems: "center", flexDirection: "row" },
  backText: { color: theme.colors.brand, fontSize: 14, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 48 },
  identity: { alignItems: "center", flexDirection: "row", gap: 12 },
  identityIcon: { alignItems: "center", backgroundColor: theme.colors.accent, borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  overline: { color: theme.colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.7, textTransform: "uppercase" },
  title: { color: theme.colors.textPrimary, fontFamily: theme.fonts.serifBlack, fontSize: 28, lineHeight: 34, marginTop: 2 },
  lead: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  metric: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, flexBasis: "22%", flexGrow: 1, minWidth: 132, padding: 12 },
  metricValue: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: "900" },
  metricLabel: { color: theme.colors.textSecondary, fontSize: 9, fontWeight: "800", letterSpacing: 0.8, marginTop: 3, textTransform: "uppercase" },
  coverageNotice: { alignItems: "flex-start", backgroundColor: "#E8F5F3", borderColor: "#B9DED9", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 12, padding: 12 },
  coverageText: { color: theme.colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 },
  section: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 16, borderWidth: 1, marginTop: 18, padding: 14 },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: "900" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 11 },
  chip: { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: 999, borderWidth: 1, minHeight: 34, paddingHorizontal: 11, justifyContent: "center" },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { color: theme.colors.brand, fontSize: 10, fontWeight: "900" },
  chipTextActive: { color: "#FFFFFF" },
  resultCount: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 15 },
  row: { alignItems: "center", borderTopColor: theme.colors.border, borderTopWidth: 1, flexDirection: "row", gap: 10, minHeight: 86, paddingVertical: 11 },
  horseNumber: { alignItems: "center", backgroundColor: theme.colors.brand, borderRadius: 10, height: 38, justifyContent: "center", width: 38 },
  horseNumberText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  rowBody: { flex: 1, minWidth: 0 },
  horseName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: "900" },
  raceName: { color: theme.colors.brand, fontSize: 11, fontWeight: "700", marginTop: 3 },
  meta: { color: theme.colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 3 },
  finishBox: { alignItems: "center", minWidth: 42 },
  finishValue: { color: theme.colors.gold, fontSize: 15, fontWeight: "900" },
  finishLabel: { color: theme.colors.textSecondary, fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  methodology: { alignItems: "flex-start", borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 14, padding: 12 },
  methodologyText: { color: theme.colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 },
  empty: { alignItems: "center", padding: 40 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "900", marginTop: 10 },
  body: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
});
