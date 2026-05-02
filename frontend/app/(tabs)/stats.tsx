import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, API_URL } from "../../src/theme";

type Tipster = {
  source: string;
  evaluated_races: number;
  top_pick_wins: number;
  top_pick_top3: number;
  base_in_top3: number;
  win_rate: number;
  top3_rate: number;
};

export default function StatsScreen() {
  const [leaderboard, setLeaderboard] = useState<Tipster[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/stats/tipsters`);
      const j = await r.json();
      setLeaderboard(j.leaderboard || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        testID="stats-screen"
        contentContainerStyle={{ paddingBottom: 40 }}
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
          <Text style={styles.overline}>Performance</Text>
          <Text style={styles.title}>Stats & Classements</Text>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.brand} />
          <Text style={styles.infoText}>
            Les taux sont calculés sur les courses archivées disposant d&apos;un
            résultat confirmé.
          </Text>
        </View>

        {/* Tipsters leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>Leaderboard pronostiqueurs</Text>
          <Text style={styles.sectionTitle}>Qui tape juste ?</Text>
          <Text style={styles.sectionLead}>
            % de fois où le pick n°1 du média termine dans le top 3.
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.brand} />
          ) : leaderboard.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="hourglass-outline" size={28} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>
                Pas encore de courses avec résultats pour calculer le
                classement.
              </Text>
            </View>
          ) : (
            <View style={styles.lbList}>
              {leaderboard.map((t, idx) => (
                <View key={t.source} style={styles.lbRow} testID={`tipster-${idx}`}>
                  <Text style={styles.lbRank}>#{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lbSource}>{t.source}</Text>
                    <Text style={styles.lbMeta}>
                      sur {t.evaluated_races} course
                      {t.evaluated_races > 1 ? "s" : ""} •{" "}
                      {t.top_pick_wins} victoire
                      {t.top_pick_wins > 1 ? "s" : ""}
                    </Text>
                    <View style={styles.barBg}>
                      <View
                        style={[styles.barFill, { width: `${Math.min(t.top3_rate, 100)}%` }]}
                      />
                    </View>
                  </View>
                  <View style={styles.lbScoreCol}>
                    <Text style={styles.lbScore}>{t.top3_rate}%</Text>
                    <Text style={styles.lbScoreLabel}>top 3</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Links */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>Explorer</Text>
          <Text style={styles.sectionTitle}>Fiches détaillées</Text>
          <TouchableOpacity
            testID="go-archives"
            style={styles.linkCard}
            onPress={() => router.push("/(tabs)/archives")}
          >
            <Ionicons name="search" size={20} color={theme.colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Rechercher un cheval</Text>
              <Text style={styles.linkSub}>
                Tapez un nom dans Archives → voir l&apos;historique complet
                (taux victoire, toutes les courses).
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="go-admin"
            style={styles.linkCard}
            onPress={() => router.push("/admin")}
          >
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Espace admin</Text>
              <Text style={styles.linkSub}>
                Importer de nouveaux PDF • Définir la course du jour.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
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
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  infoText: { fontSize: 12, color: theme.colors.textSecondary, flex: 1, lineHeight: 17 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionOverline: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 22,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  sectionLead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 19,
  },
  empty: { alignItems: "center", padding: 24 },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8, textAlign: "center" },
  lbList: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  lbRank: {
    fontSize: 13,
    color: theme.colors.gold,
    fontWeight: "800",
    width: 30,
  },
  lbSource: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  lbMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  lbScoreCol: { alignItems: "flex-end", minWidth: 50 },
  lbScore: { fontSize: 18, fontWeight: "800", color: theme.colors.brand },
  lbScoreLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  barBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceAlt,
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  barFill: { height: "100%", backgroundColor: theme.colors.gold },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginTop: 10,
  },
  linkTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  linkSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3, lineHeight: 17 },
});
