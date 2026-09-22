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
  linked_programmes_count?: number;
  linked_results_count?: number;
  parse_quality?: { warnings?: string[] };
};

type TipsterLeader = {
  source: string;
  evaluated_races: number;
  top3_rate: number;
};

type TipsterStats = {
  leaderboard?: TipsterLeader[];
  evaluated_races?: number;
  linked_results_used?: number;
  excluded?: { no_predictions?: number; no_official_results?: number };
  methodology?: {
    source_metric?: string;
    result_priority?: string;
    exclusion_rule?: string;
  };
};

type HorseLeader = {
  name: string;
  runs: number;
  wins: number;
  top3: number;
  top3_rate: number;
};

type HorseStats = {
  leaderboard?: HorseLeader[];
  evaluated_races?: number;
  linked_results_used?: number;
  methodology?: string;
};

type AnalysisData = {
  races: RaceSummary[];
  totalDocuments: number;
  tipsters: TipsterStats;
  horses: HorseStats;
};

const EMPTY_DATA: AnalysisData = {
  races: [],
  totalDocuments: 0,
  tipsters: {},
  horses: {},
};

export default function AnalysisAnalysesScreen() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotice(null);
      const [races, tipsters, horses] = await Promise.all([
        fetchJson<{ races?: RaceSummary[]; total?: number }>(`${API_URL}/api/races?limit=500`, {
          timeoutMs: 12000,
        }),
        fetchJson<TipsterStats>(`${API_URL}/api/stats/tipsters`, { timeoutMs: 12000 }),
        fetchJson<HorseStats>(`${API_URL}/api/stats/horses`, { timeoutMs: 12000 }),
      ]);
      setData({
        races: races.races || [],
        totalDocuments: races.total || 0,
        tipsters,
        horses,
      });
    } catch (error) {
      console.error(error);
      setNotice("Impossible de calculer la synthèse avec les données disponibles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const evidence = useMemo(() => {
    const programmes = data.races.filter((race) => (race.doc_type || "programme") === "programme");
    const results = data.races.filter((race) => race.doc_type === "result");
    const linkedPairs = programmes.filter((race) => (race.linked_results_count || 0) > 0).length;
    const warnings = data.races.filter((race) => (race.parse_quality?.warnings?.length || 0) > 0).length;
    const unlinked = data.races.filter((race) =>
      race.doc_type === "result"
        ? (race.linked_programmes_count || 0) === 0
        : (race.linked_results_count || 0) === 0,
    ).length;
    const eligible = data.tipsters.evaluated_races || data.horses.evaluated_races || 0;
    const readiness = eligible >= 10 ? "solide" : eligible >= 3 ? "limitée" : "exploratoire";
    return { programmes: programmes.length, results: results.length, linkedPairs, warnings, unlinked, eligible, readiness };
  }, [data]);

  const excluded =
    (data.tipsters.excluded?.no_predictions || 0) +
    (data.tipsters.excluded?.no_official_results || 0);
  const sourceLeaders = data.tipsters.leaderboard || [];
  const horseLeaders = data.horses.leaderboard || [];
  const topSource = sourceLeaders[0];
  const topHorse = horseLeaders[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        testID="analysis-analyses-screen"
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
          <Text style={styles.overline}>Synthèse explicable</Text>
          <Text style={styles.title}>Analyses</Text>
          <Text style={styles.lead}>
            Ce que le corpus permet réellement d&apos;observer, avec sa couverture, ses limites et les données utilisées.
          </Text>
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.gold} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.brand} />
        ) : (
          <>
            <View style={styles.readinessCard}>
              <View style={styles.readinessIcon}>
                <Ionicons name="analytics-outline" size={25} color={theme.colors.gold} />
              </View>
              <View style={styles.readinessCopy}>
                <Text style={styles.readinessKicker}>Niveau de preuve</Text>
                <Text style={styles.readinessTitle}>Lecture {evidence.readiness}</Text>
                <Text style={styles.readinessBody}>
                  {evidence.eligible} course{evidence.eligible === 1 ? "" : "s"} exploitable{evidence.eligible === 1 ? "" : "s"} avec résultat officiel.
                </Text>
              </View>
            </View>

            <View style={styles.metrics}>
              <Metric label="Documents" value={data.totalDocuments} icon="documents-outline" />
              <Metric label="Paires liées" value={evidence.linkedPairs} icon="link-outline" />
              <Metric label="Courses évaluées" value={evidence.eligible} icon="checkmark-done-outline" />
              <Metric label="Courses exclues" value={excluded} icon="remove-circle-outline" />
            </View>

            <SectionHeading kicker="Observations" title="Ce que montrent les données" />
            <View style={styles.findings}>
              <Finding
                icon="git-compare-outline"
                title="Couverture programme–résultat"
                body={
                  evidence.linkedPairs
                    ? `${evidence.linkedPairs} programme${evidence.linkedPairs > 1 ? "s sont reliés" : " est relié"} à un résultat officiel sur ${evidence.programmes}.`
                    : "Aucune paire programme–résultat n'est encore reliée. Les comparaisons historiques restent donc incomplètes."
                }
                action="Examiner les courses"
                onPress={() => router.push("/(tabs)/programmes")}
              />
              <Finding
                icon="newspaper-outline"
                title="Comparaison des sources"
                body={sourceFinding(topSource, evidence.eligible)}
                action="Voir la méthodologie des sources"
                onPress={() => router.push("/(tabs)/pronostics")}
              />
              <Finding
                icon="people-outline"
                title="Historique des chevaux"
                body={horseFinding(topHorse, data.horses.evaluated_races || 0)}
                action="Explorer les chevaux"
                onPress={() => router.push("/(tabs)/partants")}
              />
            </View>

            <SectionHeading kicker="Qualité" title="Limites à résoudre" />
            <View style={styles.limitPanel}>
              <LimitRow
                label="Documents non liés"
                value={evidence.unlinked}
                detail="À rapprocher d'un programme ou résultat correspondant."
              />
              <LimitRow
                label="Avertissements d'extraction"
                value={evidence.warnings}
                detail="À contrôler dans les PDF et l'administration."
              />
              <LimitRow
                label="Sans résultat officiel exploitable"
                value={data.tipsters.excluded?.no_official_results || 0}
                detail="Exclus des calculs de performance des sources."
              />
            </View>

            <SectionHeading kicker="Méthode" title="Comment lire cette synthèse" />
            <View style={styles.methodology}>
              <MethodStep
                number="01"
                title="Relier les documents"
                body="Un programme et son résultat officiel doivent représenter la même course."
              />
              <MethodStep
                number="02"
                title="Évaluer uniquement les preuves disponibles"
                body={data.tipsters.methodology?.exclusion_rule || "Les courses incomplètes sont exclues des calculs concernés."}
              />
              <MethodStep
                number="03"
                title="Conserver le contexte"
                body="Les taux sont toujours présentés avec le nombre de courses évaluées et ne prédisent pas une course future."
              />
            </View>

            <ResearchLink
              title="Approfondir dans Recherche"
              detail="Retrouver une course, un cheval ou une personne dans le corpus."
              route="/(tabs)/archives"
              onOpen={(route) => router.push(route)}
            />
          </>
        )}

        <Text style={styles.disclaimer}>
          Synthèse historique à vocation informative. Aucun signal affiché ne constitue une recommandation de pari.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function sourceFinding(source: TipsterLeader | undefined, evaluated: number) {
  if (!source || evaluated === 0) {
    return "Le corpus ne contient pas encore assez de pronostics reliés à des résultats officiels pour comparer les sources.";
  }
  if (evaluated < 3) {
    return `${source.source} apparaît dans l'échantillon, mais ${evaluated} course${evaluated > 1 ? "s" : ""} ne suffi${evaluated > 1 ? "sent" : "t"} pas pour conclure.`;
  }
  return `${source.source} présente le meilleur taux top 3 observé (${source.top3_rate} %) sur ${source.evaluated_races} courses évaluées.`;
}

function horseFinding(horse: HorseLeader | undefined, evaluated: number) {
  if (!horse || evaluated === 0) {
    return "Aucun historique cheval ne peut encore être calculé à partir de résultats officiels reliés.";
  }
  if (evaluated < 3) {
    return `${horse.name} figure dans les données disponibles, mais l'échantillon de ${evaluated} course${evaluated > 1 ? "s" : ""} reste trop faible pour généraliser.`;
  }
  return `${horse.name} ressort sur le taux top 3 observé (${horse.top3_rate} %) avec ${horse.runs} apparitions évaluées.`;
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

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionKicker}>{kicker}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Finding({ icon, title, body, action, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.findingCard}>
      <View style={styles.findingIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.brand} />
      </View>
      <Text style={styles.findingTitle}>{title}</Text>
      <Text style={styles.findingBody}>{body}</Text>
      <TouchableOpacity style={styles.findingAction} onPress={onPress}>
        <Text style={styles.findingActionText}>{action}</Text>
        <Ionicons name="arrow-forward" size={15} color={theme.colors.brand} />
      </TouchableOpacity>
    </View>
  );
}

function LimitRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <View style={styles.limitRow}>
      <View style={styles.limitValue}><Text style={styles.limitValueText}>{value}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.limitLabel}>{label}</Text>
        <Text style={styles.limitDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function MethodStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <View style={styles.methodStep}>
      <Text style={styles.methodNumber}>{number}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.methodTitle}>{title}</Text>
        <Text style={styles.methodBody}>{body}</Text>
      </View>
    </View>
  );
}

function ResearchLink({ title, detail, route, onOpen }: {
  title: string;
  detail: string;
  route: Href;
  onOpen: (route: Href) => void;
}) {
  return (
    <TouchableOpacity style={styles.researchLink} onPress={() => onOpen(route)}>
      <Ionicons name="search-outline" size={21} color={theme.colors.gold} />
      <View style={{ flex: 1 }}>
        <Text style={styles.researchTitle}>{title}</Text>
        <Text style={styles.researchDetail}>{detail}</Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={theme.colors.gold} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingBottom: 36 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  overline: { color: theme.colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  title: { marginTop: 6, color: theme.colors.brand, fontFamily: theme.fonts.serifBlack, fontSize: 40, lineHeight: 44 },
  lead: { marginTop: 8, maxWidth: 680, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21 },
  notice: { marginHorizontal: 16, padding: 12, flexDirection: "row", gap: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  noticeText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13, fontWeight: "700" },
  loader: { paddingVertical: 50 },
  readinessCard: { marginHorizontal: 16, padding: 17, flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: theme.colors.brand },
  readinessIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  readinessCopy: { flex: 1 },
  readinessKicker: { color: theme.colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" },
  readinessTitle: { marginTop: 2, color: "#fff", fontFamily: theme.fonts.serifBlack, fontSize: 24 },
  readinessBody: { marginTop: 3, color: "rgba(255,255,255,0.74)", fontSize: 12, lineHeight: 17 },
  metrics: { marginTop: 10, paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "48%", minHeight: 108, padding: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  metricValue: { marginTop: 8, color: theme.colors.textPrimary, fontFamily: theme.fonts.serifBlack, fontSize: 28 },
  metricLabel: { marginTop: 2, color: theme.colors.textSecondary, fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  sectionHeader: { marginTop: 27, marginBottom: 12, paddingHorizontal: 20 },
  sectionKicker: { color: theme.colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.8, textTransform: "uppercase" },
  sectionTitle: { marginTop: 4, color: theme.colors.textPrimary, fontFamily: theme.fonts.serifBlack, fontSize: 25, lineHeight: 30 },
  findings: { paddingHorizontal: 16, gap: 10 },
  findingCard: { padding: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  findingIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  findingTitle: { marginTop: 12, color: theme.colors.textPrimary, fontSize: 16, fontWeight: "800" },
  findingBody: { marginTop: 6, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 },
  findingAction: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 6 },
  findingActionText: { color: theme.colors.brand, fontSize: 12, fontWeight: "800" },
  limitPanel: { marginHorizontal: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  limitRow: { minHeight: 80, padding: 13, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  limitValue: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  limitValueText: { color: theme.colors.brand, fontFamily: theme.fonts.serifBlack, fontSize: 20 },
  limitLabel: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: "800" },
  limitDetail: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16 },
  methodology: { marginHorizontal: 16, borderLeftWidth: 2, borderLeftColor: theme.colors.gold },
  methodStep: { paddingLeft: 14, paddingBottom: 18, flexDirection: "row", gap: 12 },
  methodNumber: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  methodTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: "800" },
  methodBody: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
  researchLink: { marginHorizontal: 16, marginTop: 8, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.brand },
  researchTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  researchDetail: { marginTop: 3, color: "rgba(255,255,255,0.72)", fontSize: 11, lineHeight: 16 },
  disclaimer: { marginHorizontal: 24, marginTop: 24, color: theme.colors.textSecondary, fontSize: 11, lineHeight: 17, textAlign: "center" },
});
