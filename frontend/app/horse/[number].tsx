import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme, API_URL, formatFCFA } from "../../src/theme";
import FormHeatmap from "../../src/FormHeatmap";
import PerformanceChart from "../../src/PerformanceChart";

type HorseDetailData = {
  horse: {
    number: number;
    name: string;
    jockey: string;
    trainer: string;
    owner: string;
    weight: string;
    age: number;
    sex: string;
    perf: string;
    gains_fcfa: number;
    commentary: string;
  };
  expert_mentions: { source: string; rank: number }[];
  classifications: string[];
  consensus_score: number;
};

type HorseAppearance = {
  race_id: string;
  race_name: string;
  date_text: string;
  date_iso: string;
  location: string;
  number: number;
  jockey: string;
  trainer: string;
  perf: string;
  finishing_pos: number | null;
};

type HorseHistoryData = {
  appearances: HorseAppearance[];
  stats: {
    total_appearances: number;
    total_runs_with_result: number;
    wins: number;
    places_top3: number;
    win_rate: number;
    place_rate: number;
  };
};

export default function HorseDetail() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const router = useRouter();
  const [data, setData] = useState<HorseDetailData | null>(null);
  const [history, setHistory] = useState<HorseHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/horses/${number}`);
      const j = await r.json();
      setData(j);

      const historyRes = await fetch(
        `${API_URL}/api/stats/horses/${encodeURIComponent(j.horse.name)}`
      );
      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        setHistory({
          appearances: historyJson.appearances || [],
          stats: historyJson.stats,
        });
      } else {
        setHistory(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [number]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <View style={styles.loader} testID="horse-detail-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const { horse, expert_mentions, classifications, consensus_score } = data;
  const intelligence = buildHorseIntelligence(data, history);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="horse-back-btn"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
          <Text style={styles.backText}>Partants</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        testID="horse-detail-screen"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroNumWrap}>
            <View style={styles.heroNum}>
              <Text style={styles.heroNumText}>{horse.number}</Text>
            </View>
            <Text style={styles.heroOverline}>Fiche cheval</Text>
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroName}>{horse.name}</Text>
            <Text style={styles.heroMeta}>
              {horse.age} ans • {horse.sex === "F" ? "Femelle" : horse.sex === "H" ? "Hongre" : "Mâle"} • {horse.weight}
            </Text>
          </View>
        </View>

        {/* Jockey / Trainer / Owner */}
        <View style={styles.infoGrid}>
          <InfoCell label="Jockey" value={horse.jockey} />
          <InfoCell label="Entraîneur" value={horse.trainer} />
          <InfoCell label="Propriétaire" value={horse.owner} span />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Intelligence cheval</Text>
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="sparkles-outline" size={18} color={theme.colors.gold} />
              <Text style={styles.insightTitle}>A retenir</Text>
            </View>
            <Text style={styles.insightBody}>{intelligence.summary}</Text>
            <View style={styles.signalRow}>
              {intelligence.signals.map((signal) => (
                <View key={signal} style={styles.signalPill}>
                  <Text style={styles.signalText}>{signal}</Text>
                </View>
              ))}
            </View>
            <View style={styles.metricGrid}>
              <Metric label="Courses" value={intelligence.totalAppearances} />
              <Metric label="Top 3" value={intelligence.top3Rate} />
              <Metric label="Victoire" value={intelligence.winRate} />
              <Metric label="Moy. arrivee" value={intelligence.avgFinish} />
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.section}>
          <Text style={styles.label}>Performances</Text>
          <FormHeatmap perf={horse.perf} size={36} />
          <Text style={styles.perfHint}>
            5 dernières courses (le plus récent à gauche) • Or = victoire, Vert = top 3, Ocre = 4-5
          </Text>
        </View>

        {/* Trend chart */}
        <View style={styles.section}>
          <Text style={styles.label}>Évolution</Text>
          <PerformanceChart perf={horse.perf} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Gains totaux</Text>
          <Text style={styles.gains}>{formatFCFA(horse.gains_fcfa)}</Text>
        </View>

        {/* Consensus */}
        <View style={styles.section}>
          <Text style={styles.label}>Score consensus</Text>
          <View style={styles.consensusBox}>
            <Text style={styles.consensusScore}>{consensus_score}</Text>
            <Text style={styles.consensusSub}>
              points — cité par {expert_mentions.length}/7 médias
            </Text>
          </View>
          {expert_mentions.length > 0 && (
            <View style={styles.mentionsList}>
              {expert_mentions.map((m) => (
                <View key={m.source} style={styles.mentionRow}>
                  <Text style={styles.mentionSource}>{m.source}</Text>
                  <Text style={styles.mentionRank}>#{m.rank}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Classifications */}
        {classifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Catégories rédaction</Text>
            <View style={styles.tagsRow}>
              {classifications.map((c) => (
                <View key={c} style={styles.tag}>
                  <Text style={styles.tagText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Commentary */}
        <View style={styles.section}>
          <Text style={styles.label}>L&apos;analyse</Text>
          <Text style={styles.commentary}>{horse.commentary}</Text>
        </View>

        {/* History link */}
        <View style={styles.section}>
          <TouchableOpacity
            testID="view-horse-history"
            style={styles.historyBtn}
            onPress={() => router.push(`/horse-history/${encodeURIComponent(horse.name)}`)}
            activeOpacity={0.85}
          >
            <View style={styles.historyBtnLabel}>
              <Ionicons name="stats-chart-outline" size={18} color={theme.colors.brand} />
              <Text style={styles.historyBtnText}>Voir l&apos;historique complet</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.brand} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildHorseIntelligence(
  data: HorseDetailData,
  history: HorseHistoryData | null
) {
  const stats = history?.stats;
  const runsWithResult = stats?.total_runs_with_result || 0;
  const appearances = history?.appearances || [];
  const finished = appearances.filter(
    (a): a is HorseAppearance & { finishing_pos: number } =>
      typeof a.finishing_pos === "number"
  );
  const avgFinish =
    finished.length > 0
      ? finished.reduce((sum, a) => sum + a.finishing_pos, 0) / finished.length
      : null;

  const signals: string[] = [];
  if (runsWithResult < 2) signals.push("Donnees limitees");
  if ((stats?.place_rate || 0) >= 50) signals.push("Profil regulier");
  if ((stats?.win_rate || 0) >= 25) signals.push("Signal fort");
  if (data.expert_mentions.length >= 3) signals.push("Consensus media");
  if (signals.length === 0) signals.push("A surveiller");

  const recent = finished.slice(0, 3);
  const recentTop3 = recent.filter((a) => a.finishing_pos <= 3).length;
  const formPhrase =
    recent.length === 0
      ? "Les donnees de resultats restent limitees pour evaluer sa forme recente."
      : recentTop3 >= 2
        ? "Sa forme recente montre une presence reguliere dans les premieres places."
        : recentTop3 === 1
          ? "Sa forme recente montre un signal modere, avec au moins une place notable."
          : "Ses resultats recents invitent a rester prudent dans l'analyse.";
  const mediaPhrase =
    data.expert_mentions.length > 0
      ? `Il est cite par ${data.expert_mentions.length} media(s), avec un score consensus de ${data.consensus_score}.`
      : "Il n'est pas fortement cite par les pronostics disponibles.";

  return {
    summary: `${formPhrase} ${mediaPhrase}`,
    signals: signals.slice(0, 3),
    totalAppearances: `${stats?.total_appearances || 1}`,
    top3Rate: runsWithResult ? `${stats?.place_rate || 0}%` : "-",
    winRate: runsWithResult ? `${stats?.win_rate || 0}%` : "-",
    avgFinish: avgFinish ? `${avgFinish.toFixed(1)}e` : "-",
  };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function InfoCell({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <View style={[styles.infoCell, span && { width: "100%" }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  headerBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.brand,
    marginLeft: 2,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    margin: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  heroNumWrap: {
    alignItems: "center",
    gap: 6,
  },
  heroNum: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  heroNumText: { color: "#fff", fontSize: 30, fontWeight: "900" },
  heroOverline: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginTop: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  infoCell: {
    width: "50%",
    padding: 12,
    borderColor: theme.colors.border,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: "600",
    marginTop: 4,
  },
  section: { marginTop: 20, paddingHorizontal: 16 },
  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  insightCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  insightBody: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textPrimary,
    marginTop: 10,
  },
  signalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  signalPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  signalText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: theme.colors.border,
  },
  metricCell: {
    width: "50%",
    padding: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  metricLabel: {
    fontSize: 9,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 3,
  },
  perfBox: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  perfText: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    fontFamily: "Courier",
    letterSpacing: 2,
  },
  perfHint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  gains: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.brand,
    letterSpacing: -0.5,
  },
  consensusBox: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  consensusScore: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 32,
    fontWeight: "900",
    color: theme.colors.gold,
  },
  consensusSub: { fontSize: 12, color: theme.colors.textSecondary, flex: 1 },
  mentionsList: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  mentionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mentionSource: { fontSize: 13, color: theme.colors.textPrimary },
  mentionRank: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.brand,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.brand,
  },
  tagText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  commentary: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.textPrimary,
    fontStyle: "italic",
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyBtnLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  historyBtnText: {
    color: theme.colors.brand,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    flexShrink: 1,
  },
});
