import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import Animated, { FadeInDown, FadeIn, runOnJS } from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, API_URL } from "../../src/theme";
import HorseLoader from "../../src/HorseLoader";
import { haptics } from "../../src/haptics";

type ExpertPred = { source: string; picks: number[] };
type Consensus = { number: number; score: number; appearances: number };
type Horse = {
  number: number;
  name: string;
  jockey: string;
  trainer: string;
};
type PersonItem = { name: string; stat?: string };
type ClassificationItem = number | string | PersonItem;
type Data = {
  experts: ExpertPred[];
  consensus: Consensus[];
  classifications: Record<string, ClassificationItem[]>;
  classement: Record<string, number[]>;
};

type Tab = "consensus" | "experts" | "aptitudes" | "classement";

type PersonSheet = {
  role: "trainer" | "jockey";
  name: string;
  horses: Horse[];
};

export default function PronosticsScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("consensus");
  const [sheet, setSheet] = useState<PersonSheet | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const [predRes, horsesRes] = await Promise.all([
        fetch(`${API_URL}/api/predictions`),
        fetch(`${API_URL}/api/horses`),
      ]);
      const pred = await predRes.json();
      const horsesJson = await horsesRes.json();
      setData(pred);
      setHorses(horsesJson.horses || []);
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

  const topConsensusNumber = useMemo(() => {
    if (!data) return null;
    const top = data.consensus.filter((c) => c.score > 0)[0];
    return top ? top.number : null;
  }, [data]);

  const openPerson = useCallback(
    (role: "trainer" | "jockey", name: string) => {
      const filtered = horses.filter((h) =>
        role === "trainer"
          ? h.trainer === name
          : h.jockey === name
      );
      setSheet({ role, name, horses: filtered });
    },
    [horses]
  );

  if (loading || !data) {
    return (
      <View style={styles.loader} testID="pronostics-loading">
        <HorseLoader size={48} label="Chargement…" />
      </View>
    );
  }

  const maxScore = Math.max(1, ...data.consensus.map((c) => c.score));
  const mediaInsight = buildMediaInsight(data, horses);

  const TAB_ORDER: Tab[] = ["consensus", "experts", "aptitudes", "classement"];

  const goToTabByDelta = (delta: number) => {
    const idx = TAB_ORDER.indexOf(tab);
    const next = Math.max(0, Math.min(TAB_ORDER.length - 1, idx + delta));
    if (next !== idx) {
      haptics.selection();
      setTab(TAB_ORDER[next]);
    }
  };

  // Horizontal pan to switch tabs
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 60 && Math.abs(e.velocityX) > 250) {
        const delta = e.translationX < 0 ? 1 : -1;
        runOnJS(goToTabByDelta)(delta);
      }
    });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.overline}>Analyse</Text>
        <Text style={styles.title}>Pronostics</Text>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { k: "consensus", label: "Consensus" },
            { k: "experts", label: "Médias" },
            { k: "aptitudes", label: "Aptitudes" },
            { k: "classement", label: "Classement" },
          ] as { k: Tab; label: string }[]
        ).map((t) => (
          <TouchableOpacity
            key={t.k}
            testID={`tab-${t.k}`}
            style={styles.tabBtn}
            onPress={() => {
              haptics.selection();
              setTab(t.k);
            }}
          >
            <Text style={[styles.tabText, tab === t.k && styles.tabTextActive]}>
              {t.label}
            </Text>
            <View
              style={[styles.tabUnderline, tab === t.k && styles.tabUnderlineActive]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <GestureDetector gesture={swipeGesture}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
        {tab === "consensus" && (
          <View testID="consensus-view" key="consensus-wrapper">
            <Text style={styles.lead}>
              Classement calculé à partir de 7 médias. Plus un cheval figure haut
              dans les pronostics, plus son score est élevé.
            </Text>
            <View style={styles.insightCard} testID="media-insight-summary">
              <View style={styles.insightHeader}>
                <Ionicons name="git-compare-outline" size={18} color={theme.colors.gold} />
                <Text style={styles.insightTitle}>{mediaInsight.title}</Text>
              </View>
              <Text style={styles.insightBody}>{mediaInsight.summary}</Text>
              <View style={styles.signalRow}>
                {mediaInsight.signals.map((signal) => (
                  <View key={signal} style={styles.signalPill}>
                    <Text style={styles.signalText}>{signal}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.metricGrid}>
                <InsightMetric label="Accord" value={mediaInsight.agreementValue} />
                <InsightMetric label="Ecart" value={mediaInsight.gapValue} />
                <InsightMetric label="Bases" value={mediaInsight.baseValue} />
                <InsightMetric label="Outlier" value={mediaInsight.outlierValue} />
              </View>
            </View>
            {data.consensus
              .filter((c) => c.score > 0)
              .map((c, idx) => (
                <Animated.View
                  key={c.number}
                  entering={FadeInDown.duration(350).delay(idx * 45)}
                >
                  <TouchableOpacity
                    testID={`consensus-row-${c.number}`}
                    style={[
                      styles.consensusRow,
                      c.number === topConsensusNumber && styles.consensusRowFavori,
                    ]}
                    onPress={() => router.push(`/horse/${c.number}`)}
                  >
                    <View style={styles.consensusRankWrap}>
                      {c.number === topConsensusNumber && (
                        <Ionicons
                          name="star"
                          size={13}
                          color={theme.colors.gold}
                          style={{ marginRight: 2 }}
                        />
                      )}
                      <Text style={styles.consensusRank}>#{idx + 1}</Text>
                    </View>
                    <View
                      style={[
                        styles.horseNumSmall,
                        c.number === topConsensusNumber && {
                          backgroundColor: theme.colors.gold,
                        },
                      ]}
                    >
                      <Text style={styles.horseNumSmallText}>{c.number}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.barBg}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${(c.score / maxScore) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.barMeta}>
                        {c.score} points • cité par {c.appearances}/7 médias
                      </Text>
                    </View>
                    {c.number === topConsensusNumber && (
                      <View style={styles.favBadge}>
                        <Ionicons name="trophy" size={10} color="#fff" />
                        <Text style={styles.favBadgeText}>FAVORI</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
          </View>
        )}

        {tab === "experts" && (
          <View testID="experts-view" key="experts-wrapper">
            <Text style={styles.lead}>
              Les bases de chaque média, classées par ordre de priorité.
            </Text>
            {data.experts.map((e, i) => (
              <Animated.View
                key={e.source}
                entering={FadeInDown.duration(300).delay(i * 40)}
                style={styles.expertCard}
              >
                <Text style={styles.expertSource}>{e.source}</Text>
                <View style={styles.picksRow}>
                  {e.picks.map((p, idx) => (
                    <TouchableOpacity
                      key={`${e.source}-${p}`}
                      onPress={() => router.push(`/horse/${p}`)}
                      style={[
                        styles.pickChip,
                        idx === 0 && styles.pickChipBase,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickChipText,
                          idx === 0 && styles.pickChipBaseText,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {tab === "aptitudes" && (
          <View testID="aptitudes-view" key="aptitudes-wrapper">
            <Text style={styles.lead}>
              Les chevaux remarqués par la rédaction selon plusieurs aptitudes —
              forme du moment, classe absolue, progression, régularité, et
              écuries en réussite.
            </Text>
            {Object.entries(data.classifications)
              .filter(([, items]) => Array.isArray(items) && items.length > 0)
              .map(([cat, items], i) => {
                const isPersonCat =
                  cat === "Entraîneurs en forme" || cat === "Jockeys en forme";
                const role: "trainer" | "jockey" =
                  cat === "Entraîneurs en forme" ? "trainer" : "jockey";
                return (
                  <Animated.View
                    key={cat}
                    entering={FadeInDown.duration(350).delay(i * 60)}
                    style={styles.catCard}
                  >
                    <Text style={styles.catTitle}>{cat}</Text>
                    <View style={styles.picksRow}>
                      {items.map((item, k) => {
                        const isNumber = typeof item === "number";
                        if (isNumber) {
                          return (
                            <TouchableOpacity
                              key={`${cat}-${item}`}
                              onPress={() => router.push(`/horse/${item}`)}
                              style={[
                                styles.pickChip,
                                item === topConsensusNumber &&
                                  styles.pickChipFavori,
                              ]}
                            >
                              {item === topConsensusNumber && (
                                <Ionicons
                                  name="star"
                                  size={9}
                                  color={theme.colors.gold}
                                  style={{
                                    position: "absolute",
                                    top: 2,
                                    right: 2,
                                  }}
                                />
                              )}
                              <Text style={styles.pickChipText}>{item}</Text>
                            </TouchableOpacity>
                          );
                        }
                        // Person: string OR object {name, stat}
                        const personName =
                          typeof item === "string" ? item : item.name;
                        const personStat =
                          typeof item === "string" ? "" : item.stat || "";
                        return (
                          <TouchableOpacity
                            key={`${cat}-${personName}-${k}`}
                            onPress={() =>
                              isPersonCat
                                ? openPerson(role, personName)
                                : null
                            }
                            activeOpacity={isPersonCat ? 0.7 : 1}
                            style={styles.namePill}
                          >
                            <View>
                              <Text style={styles.namePillText}>
                                {personName}
                              </Text>
                              {!!personStat && (
                                <Text style={styles.namePillStat}>
                                  {personStat}
                                </Text>
                              )}
                            </View>
                            {isPersonCat && (
                              <Ionicons
                                name="chevron-forward"
                                size={12}
                                color={theme.colors.textSecondary}
                                style={{ marginLeft: 4 }}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Animated.View>
                );
              })}
            {Object.values(data.classifications).every(
              (v) => !v || v.length === 0
            ) && (
              <View style={styles.emptyCat}>
                <Text style={styles.emptyText}>
                  Aucune aptitude renseignée pour cette course.
                </Text>
              </View>
            )}
          </View>
        )}

        {tab === "classement" && (
          <View testID="classement-view" key="classement-wrapper">
            <Text style={styles.lead}>
              Notre lecture stratégique : les chevaux qui peuvent renverser la
              course aux côtés des favoris.
            </Text>
            {Object.entries(data.classement || {})
              .filter(([, nums]) => Array.isArray(nums) && nums.length > 0)
              .map(([cat, nums], i) => (
                <Animated.View
                  key={cat}
                  entering={FadeInDown.duration(350).delay(i * 60)}
                  style={styles.catCard}
                >
                  <Text style={styles.catTitle}>{cat}</Text>
                  <View style={styles.picksRow}>
                    {nums.map((n) => (
                      <TouchableOpacity
                        key={`${cat}-${n}`}
                        onPress={() => router.push(`/horse/${n}`)}
                        style={styles.pickChip}
                      >
                        <Text style={styles.pickChipText}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              ))}
            {(!data.classement ||
              Object.values(data.classement).every((v) => !v || v.length === 0)) && (
              <View style={styles.emptyCat}>
                <Text style={styles.emptyText}>
                  Aucun classement renseigné pour cette course.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      </GestureDetector>

      {/* ---- Modal : Chevaux de l'entraîneur / jockey ---- */}
      <Modal
        animationType="fade"
        transparent
        visible={!!sheet}
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.sheetCard}
          >
            <Pressable onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetOverline}>
                    {sheet?.role === "trainer" ? "Entraîneur" : "Jockey"}
                  </Text>
                  <Text style={styles.sheetTitle}>{sheet?.name}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSheet(null)}
                  style={styles.sheetClose}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={theme.colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetMeta}>
                {sheet?.horses.length ?? 0} cheval(aux) dans cette course
              </Text>
              <ScrollView
                style={{ maxHeight: 340 }}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {(sheet?.horses ?? []).map((h) => (
                  <TouchableOpacity
                    key={h.number}
                    style={styles.sheetRow}
                    onPress={() => {
                      setSheet(null);
                      router.push(`/horse/${h.number}`);
                    }}
                  >
                    <View style={styles.sheetNum}>
                      <Text style={styles.sheetNumText}>{h.number}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetHorseName}>{h.name}</Text>
                      <Text style={styles.sheetHorseMeta}>
                        {sheet?.role === "trainer"
                          ? `Jockey : ${h.jockey}`
                          : `Entraîneur : ${h.trainer}`}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
                {(sheet?.horses ?? []).length === 0 && (
                  <Text style={styles.sheetEmpty}>
                    Aucun cheval de {sheet?.name} dans cette course.
                  </Text>
                )}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function buildMediaInsight(data: Data, horses: Horse[]) {
  const consensus = data.consensus.filter((c) => c.score > 0);
  const top = consensus[0];
  const second = consensus[1];
  const expertCount = data.experts.length;
  const topHorse = horses.find((h) => h.number === top?.number);
  const gap = (top?.score || 0) - (second?.score || 0);
  const agreement = expertCount ? (top?.appearances || 0) / expertCount : 0;
  const baseCounts = new Map<number, number>();

  data.experts.forEach((expert) => {
    const base = expert.picks[0];
    if (typeof base === "number") {
      baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
    }
  });

  const uniqueBases = baseCounts.size;
  const outlier = [...baseCounts.entries()]
    .map(([number, count]) => ({
      number,
      count,
      consensusAppearances:
        consensus.find((entry) => entry.number === number)?.appearances || 0,
    }))
    .filter((entry) => entry.count === 1 && entry.consensusAppearances <= 2)
    .sort((a, b) => a.consensusAppearances - b.consensusAppearances)[0];

  const signals: string[] = [];
  if (!top || expertCount === 0) {
    signals.push("Donnees limitees");
  } else if (agreement >= 0.6 && gap >= 5) {
    signals.push("Accord fort");
  } else if (agreement >= 0.4) {
    signals.push("Accord modere");
  } else {
    signals.push("Avis partages");
  }
  if (uniqueBases >= 4) signals.push("Bases dispersees");
  if (outlier) signals.push("Outlier a noter");

  const title = topHorse
    ? `Lecture medias: ${top.number} - ${topHorse.name}`
    : "Lecture medias";
  const topPhrase = topHorse
    ? `Le ${top.number} (${topHorse.name}) concentre le plus de points et apparait chez ${top.appearances}/${expertCount} media(s).`
    : "Aucun signal media dominant ne ressort encore des pronostics disponibles.";
  const spreadPhrase =
    uniqueBases >= 4
      ? `Les bases sont dispersees entre ${uniqueBases} chevaux, ce qui indique une course moins tranchee.`
      : `Les bases sont relativement regroupees autour de ${uniqueBases || 0} cheval(aux).`;
  const outlierPhrase = outlier
    ? `Le ${outlier.number} apparait comme base isolee chez un media, a lire comme un point de divergence plutot qu'une recommandation.`
    : "Aucun outlier net ne ressort dans les bases des medias.";

  return {
    title,
    summary: `${topPhrase} L'ecart avec le suivant est de ${gap} point(s). ${spreadPhrase} ${outlierPhrase}`,
    signals: signals.slice(0, 3),
    agreementValue: top && expertCount ? `${top.appearances}/${expertCount}` : "-",
    gapValue: top ? `${gap} pts` : "-",
    baseValue: `${uniqueBases}`,
    outlierValue: outlier ? `${outlier.number}` : "-",
  };
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  overline: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 32,
    color: theme.colors.textPrimary,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabBtn: { marginRight: 20, paddingVertical: 10 },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tabTextActive: { color: theme.colors.brand },
  tabUnderline: {
    height: 2,
    marginTop: 8,
    backgroundColor: "transparent",
  },
  tabUnderlineActive: { backgroundColor: theme.colors.brand },
  lead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  insightCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 14,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  insightTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  signalText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.7,
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
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginTop: 3,
  },
  consensusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  consensusRowFavori: {
    backgroundColor: "rgba(198, 162, 98, 0.06)",
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 4,
  },
  consensusRankWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: 48,
  },
  consensusRank: {
    fontSize: 13,
    color: theme.colors.gold,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  horseNumSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  horseNumSmallText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  barBg: {
    height: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  barFill: {
    height: "100%",
    backgroundColor: theme.colors.gold,
  },
  barMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
  favBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  favBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.8,
  },
  expertCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  expertSource: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  picksRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pickChip: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  pickChipBase: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  pickChipFavori: {
    borderColor: theme.colors.gold,
    borderWidth: 2,
  },
  pickChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  pickChipBaseText: { color: "#fff" },
  namePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  namePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
  namePillStat: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "700",
    marginTop: 1,
    letterSpacing: 0.2,
  },
  catCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  catTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.gold,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  emptyCat: {
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  // ---- Person sheet modal ----
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 30, 26, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheetCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sheetOverline: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  sheetClose: {
    padding: 4,
  },
  sheetMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  sheetNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetNumText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  sheetHorseName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  sheetHorseMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sheetEmpty: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    padding: 24,
    textAlign: "center",
  },
});
