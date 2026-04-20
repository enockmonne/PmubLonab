import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme, API_URL, formatFCFA, formatEuro } from "../../src/theme";

type Race = any;

export default function RaceDetail() {
  const { race_id } = useLocalSearchParams<{ race_id: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/races/${race_id}`);
        if (r.ok) setRace(await r.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [race_id]);

  if (loading) {
    return (
      <View style={styles.loader} testID="race-detail-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  if (!race) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 40, alignItems: "center" }}>
          <Text>Course introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const prev = race.previous_results || {};

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="race-back"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
          <Text style={styles.backText}>Archives</Text>
        </TouchableOpacity>
      </View>
      <ScrollView testID="race-detail-screen" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          <Image
            source={{ uri: race.hero_image || "https://images.pexels.com/photos/6818590/pexels-photo-6818590.jpeg" }}
            style={styles.heroImg}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEvent}>{race.event_type}</Text>
            <Text style={styles.heroTitle}>{race.name}</Text>
            <Text style={styles.heroMeta}>
              {race.date_text} • {race.location}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Stat label="Discipline" value={race.discipline || "—"} />
          <Stat label="Distance" value={`${race.distance_m} m`} />
          <Stat label="Partants" value={`${race.runners}`} />
          <Stat
            label="Allocation"
            value={formatEuro(race.prize_euros)}
            subValue={formatFCFA(race.prize_fcfa)}
          />
        </View>

        {/* Top 3 consensus */}
        {race.consensus && race.consensus.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Top 3 Consensus</Text>
            <View style={styles.podium}>
              {race.consensus.slice(0, 3).map((c: any, idx: number) => (
                <View key={c.number} style={[styles.podiumItem, idx === 0 && styles.podiumGold]}>
                  <Text style={styles.podiumRank}>{idx === 0 ? "1er" : `${idx + 1}e`}</Text>
                  <Text style={[styles.podiumNum, idx === 0 && { color: "#fff" }]}>{c.number}</Text>
                  <Text style={[styles.podiumScore, idx === 0 && { color: "rgba(255,255,255,0.85)" }]}>
                    {c.score} pts
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Horses list */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Partants ({(race.horses || []).length})</Text>
          <View style={styles.list}>
            {(race.horses || []).map((h: any) => (
              <View key={h.number} style={styles.horseRow}>
                <View style={styles.hnum}>
                  <Text style={styles.hnumText}>{h.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hname} numberOfLines={1}>{h.name}</Text>
                  <Text style={styles.hmeta} numberOfLines={1}>
                    {h.jockey} • {h.trainer}
                  </Text>
                </View>
                <Text style={styles.hscore}>{h.consensus_score || 0} pts</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Previous results if any */}
        {prev && prev.finishing_order && prev.finishing_order.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Résultats précédents</Text>
            <Text style={styles.prevSub}>
              {prev.race_name} — {prev.date}
            </Text>
            <View style={styles.podium}>
              {prev.finishing_order.slice(0, 5).map((n: number, idx: number) => (
                <View key={idx} style={[styles.podiumItem, idx === 0 && styles.podiumGold]}>
                  <Text style={styles.podiumRank}>{idx + 1}</Text>
                  <Text style={[styles.podiumNum, idx === 0 && { color: "#fff" }]}>{n}</Text>
                </View>
              ))}
            </View>
            {(prev.payouts || []).length > 0 && (
              <View style={[styles.list, { marginTop: 14 }]}>
                {prev.payouts.map((p: any, idx: number) => (
                  <View
                    key={idx}
                    style={[
                      styles.payRow,
                      idx === prev.payouts.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text style={styles.payType}>{p.type}</Text>
                    <Text style={styles.payAmt}>{formatFCFA(p.amount_fcfa)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statCellLabel}>{label}</Text>
      <Text style={styles.statCellValue}>{value}</Text>
      {subValue && <Text style={styles.statCellSub}>{subValue}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  headerBar: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: { fontSize: 14, fontWeight: "600", color: theme.colors.brand, marginLeft: 2 },
  hero: { height: 180, margin: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  heroImg: { width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,46,26,0.55)" },
  heroContent: { position: "absolute", bottom: 14, left: 14, right: 14 },
  heroEvent: {
    color: theme.colors.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4, letterSpacing: -0.4 },
  heroMeta: { color: "#fff", fontSize: 12, marginTop: 4 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  statCell: {
    width: "50%",
    padding: 12,
    borderColor: theme.colors.border,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  statCellLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statCellValue: { fontSize: 17, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 4 },
  statCellSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  podium: { flexDirection: "row", gap: 8 },
  podiumItem: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  podiumGold: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  podiumRank: { fontSize: 9, letterSpacing: 1, color: theme.colors.textSecondary, fontWeight: "700", textTransform: "uppercase" },
  podiumNum: { fontSize: 20, fontWeight: "800", color: theme.colors.textPrimary, marginTop: 4 },
  podiumScore: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  list: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  horseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  hnum: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.brand, alignItems: "center", justifyContent: "center" },
  hnumText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  hname: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  hmeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  hscore: { fontSize: 13, fontWeight: "800", color: theme.colors.gold },
  prevSub: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 10, marginTop: -4 },
  payRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  payType: { fontSize: 13, fontWeight: "700", color: theme.colors.textPrimary },
  payAmt: { fontSize: 13, fontWeight: "800", color: theme.colors.brand },
});
