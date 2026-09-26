import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchJson } from "../../src/apiClient";
import { IS_ANALYSIS_APP } from "../../src/product";
import { API_URL, theme } from "../../src/theme";

type ResultStatus = "evaluated" | "non_runner" | "unavailable";

type Appearance = {
  race_id: string;
  race_name?: string;
  date_text?: string;
  date_iso?: string;
  location?: string;
  meeting_label?: string;
  discipline?: string;
  race_type?: string;
  distance_m?: number;
  number?: number;
  jockey?: string;
  trainer?: string;
  finishing_pos: number | null;
  result_status?: ResultStatus;
};

type ContextItem = { name: string; appearances: number };

type HorseProfile = {
  name: string;
  appearances: Appearance[];
  stats: {
    total_appearances: number;
    evaluated_appearances?: number;
    total_runs_with_result: number;
    wins: number;
    places_top3: number;
    win_rate: number;
    place_rate: number;
    coverage_rate?: number;
  };
  contexts?: {
    jockeys?: ContextItem[];
    trainers?: ContextItem[];
    disciplines?: ContextItem[];
    locations?: ContextItem[];
  };
  methodology?: string;
};

type CoverageFilter = "all" | "evaluated" | "unavailable";

export default function HorseHistory() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const decoded = decodeURIComponent(String(name || ""));
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<HorseProfile | null>(null);
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");
  const [discipline, setDiscipline] = useState("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await fetchJson<HorseProfile>(
          `${API_URL}/api/stats/horses/${encodeURIComponent(decoded)}`,
          { timeoutMs: 12000 },
        );
        if (active) setData(profile);
      } catch (error) {
        console.error(error);
        if (active) setNotice("Aucun historique disponible pour ce cheval dans les documents importés.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [decoded]);

  const disciplines = useMemo(
    () => Array.from(new Set(
      (data?.appearances || [])
        .map((item) => item.discipline || item.race_type)
        .filter(Boolean) as string[],
    )).sort(),
    [data],
  );

  const visibleAppearances = useMemo(() => {
    return (data?.appearances || []).filter((appearance) => {
      const status = getResultStatus(appearance);
      if (coverageFilter === "evaluated" && status !== "evaluated") return false;
      if (coverageFilter === "unavailable" && status === "evaluated") return false;
      if (discipline !== "all" && (appearance.discipline || appearance.race_type) !== discipline) return false;
      return true;
    });
  }, [coverageFilter, data, discipline]);

  const openRace = (raceId: string) => {
    const suffix = IS_ANALYSIS_APP ? "?from=analysis-courses" : "";
    router.push(`/race/${raceId}${suffix}`);
  };

  if (loading) {
    return (
      <View style={styles.loader} testID="horse-history-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.nav}>
        <TouchableOpacity testID="history-back" onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={21} color={theme.colors.brand} />
          <Text style={styles.backText}>Chevaux</Text>
        </TouchableOpacity>
      </View>

      {!data ? (
        <View style={styles.empty}>
          <Ionicons name="ribbon-outline" size={34} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Profil indisponible</Text>
          <Text style={styles.body}>{notice}</Text>
        </View>
      ) : (
        <ScrollView testID="horse-history-screen" contentContainerStyle={styles.content}>
          <Text style={styles.overline}>Profil historique</Text>
          <Text style={styles.title}>{data.name}</Text>
          <Text style={styles.lead}>
            Apparitions retrouvées dans les programmes importés, avec résultats officiels lorsqu’ils sont disponibles.
          </Text>

          <View style={styles.metrics}>
            <Metric label="Apparitions" value={`${data.stats.total_appearances}`} />
            <Metric label="Résultats disponibles" value={`${data.stats.evaluated_appearances ?? data.stats.total_runs_with_result}`} />
            <Metric label="Top 3 observés" value={`${data.stats.places_top3}`} />
            <Metric label="Couverture" value={`${data.stats.coverage_rate ?? 0} %`} />
          </View>

          <CoverageNotice stats={data.stats} />

          <Section title="Contexte observé">
            <ContextLine label="Jockeys" items={data.contexts?.jockeys || []} />
            <ContextLine label="Entraîneurs" items={data.contexts?.trainers || []} />
            <ContextLine label="Hippodromes" items={data.contexts?.locations || []} />
          </Section>

          <Section title="Participations">
            <Text style={styles.filterLabel}>Couverture du résultat</Text>
            <View style={styles.chips}>
              <FilterChip label="Toutes" active={coverageFilter === "all"} onPress={() => setCoverageFilter("all")} />
              <FilterChip label="Résultat disponible" active={coverageFilter === "evaluated"} onPress={() => setCoverageFilter("evaluated")} />
              <FilterChip label="À compléter" active={coverageFilter === "unavailable"} onPress={() => setCoverageFilter("unavailable")} />
            </View>

            {disciplines.length > 1 ? (
              <>
                <Text style={[styles.filterLabel, { marginTop: 13 }]}>Discipline</Text>
                <View style={styles.chips}>
                  <FilterChip label="Toutes" active={discipline === "all"} onPress={() => setDiscipline("all")} />
                  {disciplines.map((item) => (
                    <FilterChip key={item} label={item} active={discipline === item} onPress={() => setDiscipline(item)} />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.resultCount}>
              {visibleAppearances.length} participation{visibleAppearances.length > 1 ? "s" : ""}
            </Text>
            {visibleAppearances.length ? visibleAppearances.map((appearance, index) => (
              <AppearanceRow
                key={`${appearance.race_id}-${index}`}
                appearance={appearance}
                onPress={() => openRace(appearance.race_id)}
              />
            )) : (
              <Text style={styles.missing}>Aucune participation ne correspond à ces filtres.</Text>
            )}
          </Section>

          {data.methodology ? (
            <View style={styles.methodology}>
              <Ionicons name="information-circle-outline" size={17} color={theme.colors.brand} />
              <Text style={styles.methodologyText}>{data.methodology}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CoverageNotice({ stats }: { stats: HorseProfile["stats"] }) {
  const evaluated = stats.evaluated_appearances ?? stats.total_runs_with_result;
  const limited = evaluated < stats.total_appearances;
  const text = evaluated === 0
    ? "Aucune apparition ne dispose encore d’un résultat officiel relié. Les performances ne peuvent pas être évaluées."
    : limited
      ? `${evaluated} apparition${evaluated > 1 ? "s" : ""} sur ${stats.total_appearances} dispose${evaluated > 1 ? "nt" : ""} d’un résultat officiel. Les taux reflètent seulement cette couverture.`
      : "Toutes les apparitions affichées disposent d’un résultat officiel dans le corpus actuel.";
  return (
    <View style={[styles.coverageNotice, !limited && styles.coverageComplete]}>
      <Ionicons name={limited ? "alert-circle-outline" : "checkmark-circle-outline"} size={18} color={limited ? theme.colors.gold : theme.colors.brand} />
      <Text style={styles.coverageText}>{text}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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

function ContextLine({ label, items }: { label: string; items: ContextItem[] }) {
  return (
    <View style={styles.contextLine}>
      <Text style={styles.contextLabel}>{label}</Text>
      <Text style={styles.contextValue}>
        {items.length
          ? items.slice(0, 3).map((item) => `${item.name} (${item.appearances})`).join(" • ")
          : "Non renseigné"}
      </Text>
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

function AppearanceRow({ appearance, onPress }: { appearance: Appearance; onPress: () => void }) {
  const resultStatus = getResultStatus(appearance);
  const status = resultStatus === "non_runner"
    ? "Non-partant"
    : resultStatus === "unavailable"
      ? "Résultat non disponible"
      : appearance.finishing_pos
        ? `${appearance.finishing_pos}${appearance.finishing_pos === 1 ? "er" : "e"}`
        : "Résultat disponible";
  const context = [
    appearance.discipline || appearance.race_type,
    appearance.distance_m ? `${appearance.distance_m} m` : null,
    appearance.location || appearance.meeting_label,
  ].filter(Boolean).join(" • ");
  const people = [appearance.jockey, appearance.trainer].filter(Boolean).join(" • ");
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.statusBox, resultStatus !== "evaluated" && styles.statusBoxMuted]}>
        <Text style={[styles.statusText, resultStatus !== "evaluated" && styles.statusTextMuted]}>{status}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{appearance.race_name || "Course sans titre"}</Text>
        <Text style={styles.rowMeta}>{[appearance.date_text || appearance.date_iso, context].filter(Boolean).join(" • ")}</Text>
        <Text style={styles.rowPeople}>{people || "Jockey et entraîneur non renseignés"}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

function getResultStatus(appearance: Appearance): ResultStatus {
  return appearance.result_status || (appearance.finishing_pos ? "evaluated" : "unavailable");
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  nav: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { flexDirection: "row", alignItems: "center" },
  backText: { fontSize: 14, color: theme.colors.brand, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 48 },
  overline: { color: theme.colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { color: theme.colors.textPrimary, fontFamily: theme.fonts.serifBlack, fontSize: 30, lineHeight: 36, marginTop: 4 },
  lead: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 7 },
  metrics: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: theme.colors.border, marginTop: 18, backgroundColor: theme.colors.surface },
  metric: { width: "50%", minHeight: 74, padding: 12, borderRightWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  metricLabel: { color: theme.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  metricValue: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: "900", marginTop: 5 },
  coverageNotice: { alignItems: "flex-start", backgroundColor: "#FBF7EC", borderColor: theme.colors.border, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 12, padding: 11 },
  coverageComplete: { backgroundColor: "#F1F7F2" },
  coverageText: { color: theme.colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 },
  section: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, marginTop: 18, padding: 14 },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: "900", marginBottom: 11 },
  contextLine: { borderBottomColor: theme.colors.border, borderBottomWidth: 1, paddingVertical: 8 },
  contextLabel: { color: theme.colors.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  contextValue: { color: theme.colors.textPrimary, fontSize: 12, lineHeight: 18, marginTop: 3 },
  filterLabel: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 7 },
  chip: { borderColor: theme.colors.border, borderWidth: 1, minHeight: 34, justifyContent: "center", paddingHorizontal: 10, backgroundColor: theme.colors.surfaceAlt },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { color: theme.colors.brand, fontSize: 10, fontWeight: "900" },
  chipTextActive: { color: "#fff" },
  resultCount: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: "700", marginTop: 16, marginBottom: 5 },
  row: { alignItems: "center", borderTopColor: theme.colors.border, borderTopWidth: 1, flexDirection: "row", gap: 10, paddingVertical: 12 },
  statusBox: { alignItems: "center", backgroundColor: theme.colors.brand, justifyContent: "center", minHeight: 38, paddingHorizontal: 8, width: 78 },
  statusBoxMuted: { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderWidth: 1 },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "900", textAlign: "center" },
  statusTextMuted: { color: theme.colors.textSecondary },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: "800" },
  rowMeta: { color: theme.colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 3 },
  rowPeople: { color: theme.colors.textSecondary, fontSize: 10, fontStyle: "italic", marginTop: 2 },
  methodology: { alignItems: "flex-start", borderColor: theme.colors.border, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 14, padding: 11 },
  methodologyText: { color: theme.colors.textSecondary, flex: 1, fontSize: 11, lineHeight: 16 },
  empty: { alignItems: "center", padding: 40 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "900", marginTop: 10 },
  body: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  missing: { color: theme.colors.textSecondary, fontSize: 12, fontStyle: "italic", paddingVertical: 14 },
});
