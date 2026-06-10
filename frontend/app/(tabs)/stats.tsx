import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import { buildRaceInsight, type RaceInsightData } from "../../src/raceInsight";
import { buildMediaInsight, type MediaInsightData } from "../../src/mediaInsight";

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

type StatsTab = "summary" | "sources" | "people";

export default function StatsScreen() {
  const [leaderboard, setLeaderboard] = useState<Tipster[]>([]);
  const [jockeys, setJockeys] = useState<Person[]>([]);
  const [trainers, setTrainers] = useState<Person[]>([]);
  const [currentRace, setCurrentRace] = useState<RaceInsightData | null>(null);
  const [currentMedia, setCurrentMedia] = useState<MediaInsightData | null>(null);
  const [linkedResultsUsed, setLinkedResultsUsed] = useState(0);
  const [evaluatedRaces, setEvaluatedRaces] = useState(0);
  const [statsTab, setStatsTab] = useState<StatsTab>("summary");
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
      const current = await fetch(`${API_URL}/api/races/current`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      setLeaderboard(tip.leaderboard || []);
      setLinkedResultsUsed(tip.linked_results_used || 0);
      setEvaluatedRaces(tip.evaluated_races || 0);
      setJockeys(ppl.jockeys || []);
      setTrainers(ppl.trainers || []);
      setCurrentRace(
        current
          ? {
              race: {
                name: current.name || "Course actuelle",
                runners: current.runners || (current.horses || []).length,
              },
              consensus: current.consensus || [],
              horses: current.horses || [],
              predictions_count: (current.predictions || []).length,
            }
          : null,
      );
      setCurrentMedia(
        current
          ? {
              experts: current.predictions || [],
              consensus: current.consensus || [],
              horses: current.horses || [],
            }
          : null,
      );
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
  const raceInsight = currentRace ? buildRaceInsight(currentRace) : null;
  const mediaInsight = currentMedia ? buildMediaInsight(currentMedia) : null;
  const visibleLeaderboard = leaderboard.slice(0, 5);
  const visiblePeople = activePeople.slice(0, 5);
  const topConsensus = (currentMedia?.consensus || [])
    .filter((entry) => entry.score > 0)
    .slice(0, 3);
  const topConsensusHorse = topConsensus[0];

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
          <Text style={styles.title}>Stats</Text>
          <Text style={styles.headerLead}>
            Synthese claire des signaux construits avec les resultats officiels.
          </Text>
        </View>

        <View style={styles.snapshotGrid}>
          <View style={styles.snapshotTile}>
            <View style={styles.snapshotIcon}>
              <Ionicons name="flag-outline" size={17} color={theme.colors.brand} />
            </View>
            <View>
              <Text style={styles.snapshotValue}>{evaluatedRaces}</Text>
              <Text style={styles.snapshotLabel}>courses evaluees</Text>
            </View>
          </View>
          <View style={styles.snapshotTile}>
            <View style={styles.snapshotIcon}>
              <Ionicons name="link-outline" size={17} color={theme.colors.brand} />
            </View>
            <View>
              <Text style={styles.snapshotValue}>{linkedResultsUsed}</Text>
              <Text style={styles.snapshotLabel}>resultats lies</Text>
            </View>
          </View>
          <View style={styles.snapshotTile}>
            <View style={styles.snapshotIcon}>
              <Ionicons name="newspaper-outline" size={17} color={theme.colors.brand} />
            </View>
            <View>
              <Text style={styles.snapshotValue}>{sourcesCount}</Text>
              <Text style={styles.snapshotLabel}>sources suivies</Text>
            </View>
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

        <View style={styles.statsTabs}>
          {(
            [
              { key: "summary", label: "Synthese" },
              { key: "sources", label: "Sources" },
              { key: "people", label: "Acteurs" },
            ] as { key: StatsTab; label: string }[]
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              testID={`stats-tab-${tab.key}`}
              style={[styles.statsTabBtn, statsTab === tab.key && styles.statsTabBtnActive]}
              onPress={() => setStatsTab(tab.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.statsTabText, statsTab === tab.key && styles.statsTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {statsTab === "summary" && (
          <>
        <View style={styles.summaryCard} testID="stats-summary-card">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Ionicons name="analytics-outline" size={18} color={theme.colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Lecture rapide</Text>
              <Text style={styles.summaryTitle}>
                {currentRace?.race.name || "Course actuelle"}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <CompactInsightRow
            icon="ribbon-outline"
            label="Signal du moment"
            title={bestTipster ? bestTipster.source : "Donnees limitees"}
            text={insightText}
            value={bestTipster ? `${bestTipster.top3_rate}% top 3` : undefined}
          />

          {raceInsight && (
            <CompactInsightRow
              testID="race-insight-summary"
              icon="flash-outline"
              label="Intelligence course"
              title={raceInsight.title}
              text={raceInsight.summary}
              value={raceInsight.consensusValue}
            />
          )}

          {mediaInsight && (
            <CompactInsightRow
              testID="media-insight-summary"
              icon="git-compare-outline"
              label="Accord medias"
              title={mediaInsight.title}
              text={mediaInsight.summary}
              value={mediaInsight.agreementValue}
            />
          )}
        </View>

        {topConsensus.length > 0 && (
          <View style={styles.section} testID="stats-consensus-summary">
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionOverline}>Synthese pronostics</Text>
                <Text style={styles.sectionTitle}>Consensus</Text>
              </View>
              {topConsensusHorse && (
                <View style={styles.topBadge}>
                  <Text style={styles.topBadgeText}>N° {topConsensusHorse.number}</Text>
                </View>
              )}
            </View>
            <View style={styles.consensusStrip}>
              {topConsensus.map((pick, idx) => (
                <TouchableOpacity
                  key={pick.number}
                  testID={`stats-consensus-${pick.number}`}
                  style={styles.consensusStripItem}
                  onPress={() => router.push(`/horse/${pick.number}`)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.consensusStripRank}>
                    {idx === 0 ? "1er" : idx === 1 ? "2e" : "3e"}
                  </Text>
                  <Text style={styles.consensusStripNumber}>{pick.number}</Text>
                  <Text style={styles.consensusStripMeta}>
                    {pick.score} pts · {pick.appearances} media
                    {pick.appearances > 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
          </>
        )}

        {/* Tipsters leaderboard */}
        {statsTab === "sources" && (
          <View style={styles.section}>
            <Text style={styles.sectionOverline}>Sources</Text>
            <Text style={styles.sectionTitle}>Performance des medias</Text>
            <Text style={styles.sectionLead}>
              Lecture du pick n1 de chaque source, compare aux resultats officiels.
            </Text>

            <View style={styles.contextRow}>
              <ContextPill
                icon="link-outline"
                label="Resultats lies"
                value={`${linkedResultsUsed}`}
              />
              <ContextPill
                icon="flag-outline"
                label="Courses"
                value={`${evaluatedRaces}`}
              />
            </View>

            {bestTipster && (
              <View style={styles.focusCard}>
                <View style={styles.focusIcon}>
                  <Ionicons name="ribbon-outline" size={18} color={theme.colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.focusLabel}>Source la plus reguliere</Text>
                  <Text style={styles.focusTitle}>{bestTipster.source}</Text>
                  <Text style={styles.focusText}>
                    {bestTipster.top3_rate}% top 3 sur {bestTipster.evaluated_races} course
                    {bestTipster.evaluated_races > 1 ? "s" : ""}.
                  </Text>
                </View>
              </View>
            )}

            {loading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.brand} />
            ) : leaderboard.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="hourglass-outline" size={28} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>
                  Pas encore de courses avec resultats pour calculer le classement.
                </Text>
              </View>
            ) : (
              <View style={styles.rankingList}>
                {visibleLeaderboard.map((t, idx) => (
                  <RankingRow
                    key={t.source}
                    testID={`tipster-${idx}`}
                    rank={idx + 1}
                    title={t.source}
                    meta={`${t.top_pick_wins} vict. - ${t.evaluated_races} course${
                      t.evaluated_races > 1 ? "s" : ""
                    }`}
                    score={`${t.top3_rate}%`}
                    scoreLabel="top 3"
                    progress={t.top3_rate}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* People Leaderboard (jockeys / trainers) */}
        {statsTab === "people" && (
          <View style={styles.section}>
            <Text style={styles.sectionOverline}>Acteurs</Text>
            <Text style={styles.sectionTitle}>Jockeys & entraineurs</Text>
            <Text style={styles.sectionLead}>
              Classement base sur les arrivees archivees: victoires, top 3 et volume.
            </Text>

            <View style={styles.peopleTabs}>
              <TouchableOpacity
                testID="people-tab-jockeys"
                style={[
                  styles.peopleTabBtn,
                  peopleTab === "jockeys" && styles.peopleTabBtnActive,
                ]}
                onPress={() => setPeopleTab("jockeys")}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.peopleTabText,
                    peopleTab === "jockeys" && styles.peopleTabTextActive,
                  ]}
                >
                  Jockeys
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="people-tab-trainers"
                style={[
                  styles.peopleTabBtn,
                  peopleTab === "trainers" && styles.peopleTabBtnActive,
                ]}
                onPress={() => setPeopleTab("trainers")}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.peopleTabText,
                    peopleTab === "trainers" && styles.peopleTabTextActive,
                  ]}
                >
                  Entraineurs
                </Text>
              </TouchableOpacity>
            </View>

            {bestPerson && (
              <View style={styles.focusCard}>
                <View style={styles.focusIcon}>
                  <Ionicons name="trophy-outline" size={18} color={theme.colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.focusLabel}>En tete</Text>
                  <Text style={styles.focusTitle}>{bestPerson.name}</Text>
                  <Text style={styles.focusText}>
                    {bestPerson.wins} victoire{bestPerson.wins > 1 ? "s" : ""} -{" "}
                    {bestPerson.top3} top 3 sur {bestPerson.races} course
                    {bestPerson.races > 1 ? "s" : ""}.
                  </Text>
                </View>
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
              <View style={styles.rankingList}>
                {visiblePeople.map((p, idx) => (
                  <RankingRow
                    key={p.name}
                    testID={`person-${peopleTab}-${idx}`}
                    rank={idx + 1}
                    title={p.name}
                    meta={`${p.wins} V - ${p.top3} top 3 - ${p.races} course${
                      p.races > 1 ? "s" : ""
                    }`}
                    score={`${p.win_rate}%`}
                    scoreLabel="vict."
                    progress={p.top3_rate}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CompactInsightRow({
  icon,
  label,
  title,
  text,
  value,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  title: string;
  text: string;
  value?: string;
  testID?: string;
}) {
  return (
    <View style={styles.compactInsightRow} testID={testID}>
      <View style={styles.compactInsightIcon}>
        <Ionicons name={icon} size={16} color={theme.colors.gold} />
      </View>
      <View style={styles.compactInsightBody}>
        <View style={styles.compactInsightTop}>
          <Text style={styles.compactInsightLabel}>{label}</Text>
          {value && <Text style={styles.compactInsightValue}>{value}</Text>}
        </View>
        <Text style={styles.compactInsightTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.compactInsightText} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function ContextPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.contextPill}>
      <Ionicons name={icon} size={14} color={theme.colors.brand} />
      <View>
        <Text style={styles.contextPillValue}>{value}</Text>
        <Text style={styles.contextPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

function RankingRow({
  rank,
  title,
  meta,
  score,
  scoreLabel,
  progress,
  testID,
}: {
  rank: number;
  title: string;
  meta: string;
  score: string;
  scoreLabel: string;
  progress: number;
  testID: string;
}) {
  return (
    <View style={styles.rankingRow} testID={testID}>
      <View style={styles.rankingRank}>
        <Text style={styles.rankingRankText}>{rank}</Text>
      </View>
      <View style={styles.rankingBody}>
        <View style={styles.rankingTop}>
          <Text style={styles.rankingTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.rankingScore}>
            <Text style={styles.rankingScoreValue}>{score}</Text>
            <Text style={styles.rankingScoreLabel}>{scoreLabel}</Text>
          </View>
        </View>
        <Text style={styles.rankingMeta} numberOfLines={1}>
          {meta}
        </Text>
        <View style={styles.rankingBarBg}>
          <View
            style={[
              styles.rankingBarFill,
              { width: `${Math.min(Math.max(progress, 0), 100)}%` },
            ]}
          />
        </View>
      </View>
    </View>
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
  headerLead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  snapshotGrid: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  snapshotTile: {
    flex: 1,
    minHeight: 68,
    padding: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
  },
  snapshotIcon: {
    display: "none",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  snapshotValue: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  snapshotLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    lineHeight: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    textAlign: "center",
    marginTop: 2,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "transparent",
  },
  infoText: { fontSize: 11, color: theme.colors.textSecondary, flex: 1, lineHeight: 15 },
  statsTabs: {
    flexDirection: "row",
    gap: 0,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  statsTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  statsTabBtnActive: {
    backgroundColor: theme.colors.brand,
  },
  statsTabText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.textSecondary,
  },
  statsTabTextActive: {
    color: "#fff",
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  summaryLabel: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  compactInsightRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  compactInsightIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactInsightBody: {
    flex: 1,
    minWidth: 0,
  },
  compactInsightTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  compactInsightLabel: {
    flex: 1,
    fontSize: 9,
    color: theme.colors.gold,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  compactInsightValue: {
    fontSize: 10,
    color: theme.colors.brand,
    fontWeight: "900",
  },
  compactInsightTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  compactInsightText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginTop: 3,
  },
  section: { marginTop: 18, paddingHorizontal: 16 },
  sectionOverline: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 20,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  sectionLead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  sectionNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 17,
  },
  contextRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  contextPill: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  contextPillValue: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  contextPillLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  focusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  focusIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  focusLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: theme.colors.gold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  focusTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  focusText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.brand,
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  consensusStrip: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  consensusStripItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  consensusStripRank: {
    width: 30,
    fontSize: 11,
    color: theme.colors.gold,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  consensusStripNumber: {
    width: 34,
    height: 34,
    lineHeight: 34,
    textAlign: "center",
    backgroundColor: theme.colors.brand,
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  consensusStripMeta: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  rankingList: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rankingRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rankingRank: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rankingRankText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.gold,
  },
  rankingBody: {
    flex: 1,
    minWidth: 0,
  },
  rankingTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rankingTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  rankingScore: {
    alignItems: "flex-end",
    minWidth: 50,
  },
  rankingScoreValue: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.brand,
  },
  rankingScoreLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  rankingMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rankingBarBg: {
    height: 5,
    marginTop: 7,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rankingBarFill: {
    height: "100%",
    backgroundColor: theme.colors.gold,
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
    gap: 8,
    marginTop: 14,
    marginBottom: 6,
  },
  peopleTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  peopleTabBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  peopleTabText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.textSecondary,
  },
  peopleTabTextActive: { color: "#fff" },
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
});
