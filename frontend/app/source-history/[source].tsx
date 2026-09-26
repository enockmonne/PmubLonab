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
import { fetchJson } from "../../src/apiClient";
import { API_URL, theme } from "../../src/theme";

type ResultStatus = "evaluated" | "missing_official_result" | "missing_selection";
type CoverageFilter = "all" | "evaluated" | "excluded";

type Selection = {
  number: number;
  horse_name?: string | null;
};

type SourceAppearance = {
  race_id: string;
  race_name?: string;
  date_iso?: string;
  date_text?: string;
  location?: string;
  discipline?: string;
  distance_m?: number;
  raw_sources?: string[];
  picks: number[];
  selections?: Selection[];
  official_order: number[];
  result_race_id?: string | null;
  result_status: ResultStatus;
  exclusion_reason?: string | null;
  top_pick?: number | null;
  top_pick_position?: number | null;
  top_pick_won: boolean;
  top_pick_top3: boolean;
  base_in_top3: boolean;
};

type SourceProfile = {
  source: string;
  aliases: string[];
  stats: {
    total_appearances: number;
    evaluated_races: number;
    excluded_races: number;
    top_pick_wins: number;
    top_pick_top3: number;
    base_in_top3: number;
    win_rate: number;
    top3_rate: number;
    coverage_rate: number;
  };
  appearances: SourceAppearance[];
  methodology: string;
};

export default function SourceHistory() {
  const { source } = useLocalSearchParams<{ source: string }>();
  const decoded = decodeURIComponent(String(source || ""));
  const router = useRouter();
  const [data, setData] = useState<SourceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<CoverageFilter>("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await fetchJson<SourceProfile>(
          `${API_URL}/api/stats/tipsters/${encodeURIComponent(decoded)}`,
          { timeoutMs: 12000 },
        );
        if (active) setData(profile);
      } catch (error) {
        console.error(error);
        if (active) setNotice("Aucun historique disponible pour cette source dans le corpus importé.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [decoded]);

  const visibleAppearances = useMemo(() => {
    return (data?.appearances || []).filter((appearance) => {
      if (filter === "evaluated") return appearance.result_status === "evaluated";
      if (filter === "excluded") return appearance.result_status !== "evaluated";
      return true;
    });
  }, [data, filter]);

  if (loading) {
    return (
      <View style={styles.loader} testID="source-history-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={21} color={theme.colors.brand} />
          <Text style={styles.backText}>Sources</Text>
        </TouchableOpacity>
      </View>

      {!data ? (
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={34} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Source indisponible</Text>
          <Text style={styles.body}>{notice}</Text>
        </View>
      ) : (
        <ScrollView testID="source-history-screen" contentContainerStyle={styles.content}>
          <Text style={styles.overline}>Historique de la source</Text>
          <Text style={styles.title}>{data.source}</Text>
          <Text style={styles.lead}>
            Comparaison des sélections publiées avec les résultats officiels reliés. Ces observations historiques ne constituent pas un conseil de pari.
          </Text>

          <View style={styles.metrics}>
            <Metric label="Apparitions" value={`${data.stats.total_appearances}`} />
            <Metric label="Courses évaluées" value={`${data.stats.evaluated_races}`} />
            <Metric label="Pick n°1 top 3" value={`${data.stats.top_pick_top3}`} />
            <Metric label="Couverture" value={`${data.stats.coverage_rate} %`} />
          </View>

          <CoverageNotice data={data} />

          {data.aliases.length ? (
            <View style={styles.aliasPanel}>
              <Text style={styles.aliasLabel}>Noms regroupés</Text>
              <Text style={styles.aliasValue}>{data.aliases.join(" • ")}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Courses observées</Text>
            <Text style={styles.filterLabel}>Couverture du résultat</Text>
            <View style={styles.chips}>
              <FilterChip label="Toutes" active={filter === "all"} onPress={() => setFilter("all")} />
              <FilterChip label="Évaluées" active={filter === "evaluated"} onPress={() => setFilter("evaluated")} />
              <FilterChip label="Exclues" active={filter === "excluded"} onPress={() => setFilter("excluded")} />
            </View>
            <Text style={styles.resultCount}>
              {visibleAppearances.length} course{visibleAppearances.length > 1 ? "s" : ""}
            </Text>
            {visibleAppearances.length ? visibleAppearances.map((appearance) => (
              <AppearanceRow
                key={appearance.race_id}
                appearance={appearance}
                onPress={() => router.push(`/race/${appearance.race_id}?from=analysis-courses`)}
              />
            )) : (
              <Text style={styles.missing}>Aucune course ne correspond à ce filtre.</Text>
            )}
          </View>

          <View style={styles.methodology}>
            <Ionicons name="information-circle-outline" size={17} color={theme.colors.brand} />
            <Text style={styles.methodologyText}>{data.methodology}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CoverageNotice({ data }: { data: SourceProfile }) {
  const limited = data.stats.excluded_races > 0;
  const text = limited
    ? `${data.stats.evaluated_races} course${data.stats.evaluated_races > 1 ? "s" : ""} évaluée${data.stats.evaluated_races > 1 ? "s" : ""} sur ${data.stats.total_appearances}. ${data.stats.excluded_races} course${data.stats.excluded_races > 1 ? "s sont exclues" : " est exclue"} des taux faute de résultat officiel relié ou de sélection exploitable.`
    : "Toutes les apparitions de cette source disposent d’une sélection et d’un résultat officiel relié.";
  return (
    <View style={[styles.coverageNotice, !limited && styles.coverageComplete]}>
      <Ionicons name={limited ? "alert-circle-outline" : "checkmark-circle-outline"} size={18} color={limited ? theme.colors.gold : theme.colors.brand} />
      <Text style={styles.coverageText}>{text}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function AppearanceRow({ appearance, onPress }: { appearance: SourceAppearance; onPress: () => void }) {
  const evaluated = appearance.result_status === "evaluated";
  const outcome = !evaluated
    ? "Exclue"
    : appearance.top_pick_won
      ? "Pick gagnant"
      : appearance.top_pick_top3
        ? "Pick dans le top 3"
        : "Pick hors top 3";
  const context = [
    appearance.date_text || appearance.date_iso,
    appearance.discipline,
    appearance.distance_m ? `${appearance.distance_m} m` : null,
    appearance.location,
  ].filter(Boolean).join(" • ");
  const selectionText = (appearance.selections || []).slice(0, 5).map((selection) => (
    selection.horse_name ? `${selection.number} ${selection.horse_name}` : `${selection.number}`
  )).join(" · ");
  const officialText = appearance.official_order.length
    ? appearance.official_order.slice(0, 5).join("-")
    : "Non disponible";

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.statusBox, !evaluated && styles.statusBoxMuted]}>
        <Text style={[styles.statusText, !evaluated && styles.statusTextMuted]}>{outcome}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{appearance.race_name || "Course sans titre"}</Text>
        <Text style={styles.rowMeta}>{context}</Text>
        <Text style={styles.rowEvidence}>Sélection : {selectionText || "Non exploitable"}</Text>
        <Text style={styles.rowEvidence}>Arrivée officielle : {officialText}</Text>
        {appearance.exclusion_reason ? <Text style={styles.exclusion}>{appearance.exclusion_reason}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  loader: { alignItems: "center", backgroundColor: theme.colors.bg, flex: 1, justifyContent: "center" },
  nav: { borderBottomColor: theme.colors.border, borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  back: { alignItems: "center", flexDirection: "row" },
  backText: { color: theme.colors.brand, fontSize: 14, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 48 },
  overline: { color: theme.colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { color: theme.colors.textPrimary, fontFamily: theme.fonts.serifBlack, fontSize: 30, lineHeight: 36, marginTop: 4 },
  lead: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 7 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  metric: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, flexBasis: "22%", flexGrow: 1, minHeight: 68, minWidth: 140, padding: 10 },
  metricLabel: { color: theme.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  metricValue: { color: theme.colors.textPrimary, fontSize: 19, fontWeight: "900", marginTop: 4 },
  coverageNotice: { alignItems: "flex-start", backgroundColor: "#FBF7EC", borderColor: theme.colors.border, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 12, padding: 11 },
  coverageComplete: { backgroundColor: "#F1F7F2" },
  coverageText: { color: theme.colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 },
  aliasPanel: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, marginTop: 12, padding: 11 },
  aliasLabel: { color: theme.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  aliasValue: { color: theme.colors.textPrimary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  section: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, marginTop: 18, padding: 14 },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: "900", marginBottom: 11 },
  filterLabel: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 7 },
  chip: { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderWidth: 1, justifyContent: "center", minHeight: 34, paddingHorizontal: 10 },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { color: theme.colors.brand, fontSize: 10, fontWeight: "900" },
  chipTextActive: { color: "#fff" },
  resultCount: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 16 },
  row: { alignItems: "center", borderTopColor: theme.colors.border, borderTopWidth: 1, flexDirection: "row", gap: 10, paddingVertical: 12 },
  statusBox: { alignItems: "center", backgroundColor: theme.colors.brand, justifyContent: "center", minHeight: 42, paddingHorizontal: 7, width: 82 },
  statusBoxMuted: { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderWidth: 1 },
  statusText: { color: "#fff", fontSize: 9, fontWeight: "900", textAlign: "center", textTransform: "uppercase" },
  statusTextMuted: { color: theme.colors.textSecondary },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: "800" },
  rowMeta: { color: theme.colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 3 },
  rowEvidence: { color: theme.colors.textPrimary, fontSize: 10, lineHeight: 15, marginTop: 3 },
  exclusion: { color: theme.colors.gold, fontSize: 10, fontStyle: "italic", marginTop: 3 },
  methodology: { alignItems: "flex-start", borderColor: theme.colors.border, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 14, padding: 11 },
  methodologyText: { color: theme.colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 },
  empty: { alignItems: "center", padding: 40 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "900", marginTop: 10 },
  body: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  missing: { color: theme.colors.textSecondary, fontSize: 12, fontStyle: "italic", paddingVertical: 14 },
});
