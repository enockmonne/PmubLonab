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

type HorseDetail = {
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

export default function HorseDetail() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const router = useRouter();
  const [data, setData] = useState<HorseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/horses/${number}`);
      const j = await r.json();
      setData(j);
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
          <View style={styles.heroNum}>
            <Text style={styles.heroNumText}>{horse.number}</Text>
          </View>
          <Text style={styles.heroName}>{horse.name}</Text>
          <Text style={styles.heroMeta}>
            {horse.age} ans • {horse.sex === "F" ? "Femelle" : horse.sex === "H" ? "Hongre" : "Mâle"} • {horse.weight}
          </Text>
        </View>

        {/* Jockey / Trainer / Owner */}
        <View style={styles.infoGrid}>
          <InfoCell label="Jockey" value={horse.jockey} />
          <InfoCell label="Entraîneur" value={horse.trainer} />
          <InfoCell label="Propriétaire" value={horse.owner} span />
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
          >
            <Ionicons name="stats-chart-outline" size={18} color="#fff" />
            <Text style={styles.historyBtnText}>Voir l&apos;historique complet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  heroNum: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroNumText: { color: "#fff", fontSize: 30, fontWeight: "900" },
  heroName: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
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
    marginTop: 16,
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
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.brand,
    paddingVertical: 14,
  },
  historyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
