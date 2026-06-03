import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, API_URL, ADMIN_WEB_URL } from "../../src/theme";

type Tipster = {
  source: string;
  evaluated_races: number;
  top_pick_wins: number;
  top_pick_top3: number;
  base_in_top3: number;
  win_rate: number;
  top3_rate: number;
};

type Person = {
  name: string;
  races: number;
  wins: number;
  top3: number;
  win_rate: number;
  top3_rate: number;
};

export default function StatsScreen() {
  const [leaderboard, setLeaderboard] = useState<Tipster[]>([]);
  const [jockeys, setJockeys] = useState<Person[]>([]);
  const [trainers, setTrainers] = useState<Person[]>([]);
  const [linkedResultsUsed, setLinkedResultsUsed] = useState(0);
  const [evaluatedRaces, setEvaluatedRaces] = useState(0);
  const [peopleTab, setPeopleTab] = useState<"jockeys" | "trainers">("jockeys");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const [tip, ppl] = await Promise.all([
        fetch(`${API_URL}/api/stats/tipsters`).then((r) => r.json()),
        fetch(`${API_URL}/api/stats/people`).then((r) => r.json()),
      ]);
      setLeaderboard(tip.leaderboard || []);
      setLinkedResultsUsed(tip.linked_results_used || 0);
      setEvaluatedRaces(tip.evaluated_races || 0);
      setJockeys(ppl.jockeys || []);
      setTrainers(ppl.trainers || []);
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

  const bestTipster = leaderboard[0];
  const activePeople = peopleTab === "jockeys" ? jockeys : trainers;
  const bestPerson = activePeople[0];
  const sourcesCount = leaderboard.length;

  const insightText = useMemo(() => {
    if (!bestTipster) return "Les signaux se renforceront avec plus de resultats officiels.";
    if (bestTipster.evaluated_races < 3) {
      return "Lecture prudente: l'echantillon reste encore limite.";
    }
    if (bestTipster.top3_rate >= 60) {
      return `${bestTipster.source} ressort avec un signal top 3 regulier.`;
    }
    return "Les ecarts entre sources restent moderes pour le moment.";
  }, [bestTipster]);

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

        <View style={styles.snapshotGrid}>
          <View style={styles.snapshotTile}>
            <Ionicons name="flag-outline" size={18} color={theme.colors.gold} />
            <Text style={styles.snapshotValue}>{evaluatedRaces}</Text>
            <Text style={styles.snapshotLabel}>courses evaluees</Text>
          </View>
          <View style={styles.snapshotTile}>
            <Ionicons name="link-outline" size={18} color={theme.colors.gold} />
            <Text style={styles.snapshotValue}>{linkedResultsUsed}</Text>
            <Text style={styles.snapshotLabel}>resultats lies</Text>
          </View>
          <View style={styles.snapshotTile}>
            <Ionicons name="newspaper-outline" size={18} color={theme.colors.gold} />
            <Text style={styles.snapshotValue}>{sourcesCount}</Text>
            <Text style={styles.snapshotLabel}>sources suivies</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.brand} />
          <Text style={styles.infoText}>
            Les taux sont calculés sur les courses archivées disposant d&apos;un
            résultat confirmé.
          </Text>
        </View>

        <View style={styles.signalCard}>
          <View style={styles.signalIcon}>
            <Ionicons name="analytics-outline" size={20} color={theme.colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.signalLabel}>Signal du moment</Text>
            <Text style={styles.signalTitle}>
              {bestTipster ? bestTipster.source : "Donnees limitees"}
            </Text>
            <Text style={styles.signalText}>{insightText}</Text>
          </View>
          {bestTipster && (
            <View style={styles.signalScore}>
              <Text style={styles.signalScoreValue}>{bestTipster.top3_rate}%</Text>
              <Text style={styles.signalScoreLabel}>top 3</Text>
            </View>
          )}
        </View>

        {/* Tipsters leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>Leaderboard pronostiqueurs</Text>
          <Text style={styles.sectionTitle}>Qui tape juste ?</Text>
          <Text style={styles.sectionLead}>
            % de fois où le pick n°1 du média termine dans le top 3.
          </Text>

          {linkedResultsUsed > 0 && (
            <Text style={styles.sectionNote}>
              {linkedResultsUsed} resultat{linkedResultsUsed > 1 ? "s" : ""} lie
              {linkedResultsUsed > 1 ? "s" : ""} utilise
              {linkedResultsUsed > 1 ? "s" : ""} pour ces calculs.
            </Text>
          )}

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

        {/* People Leaderboard (jockeys / trainers) */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>Top performers</Text>
          <Text style={styles.sectionTitle}>Jockeys & Entraîneurs</Text>
          <Text style={styles.sectionLead}>
            Classement basé sur les arrivées des courses archivées (top 3 et
            victoires).
          </Text>

          <View style={styles.peopleTabs}>
            <TouchableOpacity
              testID="people-tab-jockeys"
              style={styles.peopleTabBtn}
              onPress={() => setPeopleTab("jockeys")}
            >
              <Text
                style={[
                  styles.peopleTabText,
                  peopleTab === "jockeys" && styles.peopleTabTextActive,
                ]}
              >
                Jockeys
              </Text>
              <View
                style={[
                  styles.peopleTabUnderline,
                  peopleTab === "jockeys" && styles.peopleTabUnderlineActive,
                ]}
              />
            </TouchableOpacity>
            <TouchableOpacity
              testID="people-tab-trainers"
              style={styles.peopleTabBtn}
              onPress={() => setPeopleTab("trainers")}
            >
              <Text
                style={[
                  styles.peopleTabText,
                  peopleTab === "trainers" && styles.peopleTabTextActive,
                ]}
              >
                Entraîneurs
              </Text>
              <View
                style={[
                  styles.peopleTabUnderline,
                  peopleTab === "trainers" && styles.peopleTabUnderlineActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          {bestPerson && (
            <View style={styles.miniHighlight}>
              <Ionicons name="ribbon-outline" size={18} color={theme.colors.gold} />
              <Text style={styles.miniHighlightText}>
                En tete: {bestPerson.name} avec {bestPerson.wins} victoire
                {bestPerson.wins > 1 ? "s" : ""} et {bestPerson.top3} top 3.
              </Text>
            </View>
          )}

          {activePeople.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="hourglass-outline"
                size={28}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyText}>
                Aucune statistique disponible pour le moment.
              </Text>
            </View>
          ) : (
            <View style={styles.lbList}>
              {activePeople
                .slice(0, 8)
                .map((p, idx) => (
                  <View
                    key={p.name}
                    style={styles.lbRow}
                    testID={`person-${peopleTab}-${idx}`}
                  >
                    <Text style={styles.lbRank}>#{idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lbSource}>{p.name}</Text>
                      <Text style={styles.lbMeta}>
                        {p.wins} V • {p.top3} top 3 • {p.races} courses
                      </Text>
                      <View style={styles.barBg}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${Math.min(p.top3_rate, 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.lbScoreCol}>
                      <Text style={styles.lbScore}>{p.win_rate}%</Text>
                      <Text style={styles.lbScoreLabel}>vict.</Text>
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
            onPress={() => Linking.openURL(ADMIN_WEB_URL)}
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
  snapshotGrid: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  snapshotTile: {
    flex: 1,
    minHeight: 94,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "space-between",
  },
  snapshotValue: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  snapshotLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    lineHeight: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  signalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  signalIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  signalLabel: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  signalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  signalText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginTop: 3,
  },
  signalScore: {
    alignItems: "flex-end",
    minWidth: 58,
  },
  signalScoreValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.brand,
  },
  signalScoreLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
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
  sectionNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 17,
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
  peopleTabs: {
    flexDirection: "row",
    gap: 24,
    marginTop: 14,
    marginBottom: 4,
  },
  peopleTabBtn: {},
  peopleTabText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.colors.textSecondary,
    paddingBottom: 8,
  },
  peopleTabTextActive: { color: theme.colors.brand },
  peopleTabUnderline: { height: 2, backgroundColor: "transparent" },
  peopleTabUnderlineActive: { backgroundColor: theme.colors.brand },
  miniHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  miniHighlightText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
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
