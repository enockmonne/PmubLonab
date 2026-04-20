import React, { useEffect, useState } from "react";
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
import { theme, API_URL } from "../../src/theme";

type Appearance = {
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

type Stats = {
  total_appearances: number;
  total_runs_with_result: number;
  wins: number;
  places_top3: number;
  win_rate: number;
  place_rate: number;
};

export default function HorseHistory() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const decoded = decodeURIComponent(String(name || ""));
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<{ appearances: Appearance[]; stats: Stats } | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/stats/horses/${encodeURIComponent(decoded)}`);
        if (r.status === 404) {
          setNotFound(true);
        } else {
          const j = await r.json();
          setData({ appearances: j.appearances, stats: j.stats });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [decoded]);

  if (loading) {
    return (
      <View style={styles.loader} testID="horse-history-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="history-back"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView testID="horse-history-screen" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          <Ionicons name="ribbon-outline" size={28} color={theme.colors.gold} />
          <Text style={styles.heroName}>{decoded}</Text>
          <Text style={styles.heroSub}>Historique cross-courses</Text>
        </View>

        {notFound || !data ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={30} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>
              Aucun historique disponible pour ce cheval.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCell label="Courses" value={`${data.stats.total_appearances}`} />
              <StatCell label="Victoires" value={`${data.stats.wins}`} />
              <StatCell label="Top 3" value={`${data.stats.places_top3}`} />
              <StatCell label="% Victoire" value={`${data.stats.win_rate}%`} highlight />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Toutes les participations</Text>
              <View style={styles.list}>
                {data.appearances.map((a, idx) => (
                  <TouchableOpacity
                    key={`${a.race_id}-${idx}`}
                    style={[styles.row, idx === data.appearances.length - 1 && { borderBottomWidth: 0 }]}
                    testID={`appearance-${idx}`}
                    onPress={() => router.push(`/race/${a.race_id}`)}
                  >
                    <View style={styles.posBox}>
                      <Text style={styles.posText}>
                        {a.finishing_pos ? `${a.finishing_pos}${a.finishing_pos === 1 ? "er" : "e"}` : "—"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {a.race_name}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {a.date_text} • {a.location}
                      </Text>
                      <Text style={styles.rowMeta2}>
                        N° {a.number} • {a.jockey} • {a.trainer}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: theme.colors.gold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  headerBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: { fontSize: 14, fontWeight: "600", color: theme.colors.brand, marginLeft: 2 },
  hero: { alignItems: "center", padding: 22, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  heroName: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 10,
    textAlign: "center",
  },
  heroSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, letterSpacing: 1, textTransform: "uppercase" },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 10, textAlign: "center" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  statCell: {
    width: "50%",
    padding: 14,
    borderColor: theme.colors.border,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  list: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  posBox: {
    width: 44,
    alignItems: "center",
    paddingVertical: 6,
    backgroundColor: theme.colors.brand,
  },
  posText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  rowMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  rowMeta2: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1, fontStyle: "italic" },
});
