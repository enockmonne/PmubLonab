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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { theme, API_URL } from "../../src/theme";
import HorseLoader from "../../src/HorseLoader";
import { haptics } from "../../src/haptics";
import { readCache, writeCache } from "../../src/storageCache";
import { fetchJson } from "../../src/apiClient";
import {
  getSelectedProgrammeId,
  setSelectedProgrammeId,
  subscribeSelectedProgramme,
} from "../../src/programmeSelection";

LocaleConfig.locales["fr"] = {
  monthNames: [
    "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
  ],
  monthNamesShort: [
    "Janv.", "Fevr.", "Mars", "Avril", "Mai", "Juin",
    "Juil.", "Aout", "Sept.", "Oct.", "Nov.", "Dec.",
  ],
  dayNames: [
    "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
  ],
  dayNamesShort: ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = "fr";

type ExpertPred = { source: string; picks: number[] };
type Consensus = { number: number; score: number; appearances: number };
type OddsValue = { number: number; odds: string };
type OddsTable = { source: string; values: OddsValue[] };
type RankedPerson = { rank: number; name: string };
type WeeklyBest = { trainers: RankedPerson[]; drivers: RankedPerson[] };
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
  odds: OddsTable[];
  weekly_best: WeeklyBest;
  consensus: Consensus[];
  classifications: Record<string, ClassificationItem[]>;
  classement: Record<string, number[]>;
};
type ProgrammeSummary = {
  race_id: string;
  name: string;
  date_text: string;
  date_iso: string;
  location: string;
  is_current: boolean;
};
type RaceMeta = {
  race_id: string;
  name: string;
  date_text: string;
  date_iso: string;
  location: string;
  is_current?: boolean;
};

type Tab = "experts" | "cotes" | "semaine" | "aptitudes" | "classement";

type PersonSheet = {
  role: "trainer" | "jockey";
  name: string;
  horses: Horse[];
};

type PronosticsCache = {
  data: Data;
  horses: Horse[];
  programmes: ProgrammeSummary[];
  selectedId: string;
  selectedRace: RaceMeta | null;
};

const PRONOSTICS_CACHE_KEY = "pmub.pronostics.v1";

export default function PronosticsScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRace, setSelectedRace] = useState<RaceMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("experts");
  const [sheet, setSheet] = useState<PersonSheet | null>(null);
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  const chooseProgramme = useCallback((raceId: string | null) => {
    setSelectedId(raceId);
    setSelectedProgrammeId(raceId);
  }, []);

  const markedDates = useMemo(() => {
    const m: Record<string, any> = {};
    programmes.forEach((p) => {
      if (!p.date_iso) return;
      m[p.date_iso] = {
        marked: true,
        dotColor: theme.colors.gold,
        selected: p.race_id === selectedId,
        selectedColor: theme.colors.brand,
      };
    });
    return m;
  }, [programmes, selectedId]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      readCache<PronosticsCache>(PRONOSTICS_CACHE_KEY),
      getSelectedProgrammeId(),
    ]).then(([cached, sharedSelectedId]) => {
      if (!mounted || !cached?.data) return;
      const nextSelectedId = sharedSelectedId || cached.selectedId || null;
      const cacheMatchesSelection = !nextSelectedId || nextSelectedId === cached.selectedId;
      if (cacheMatchesSelection) {
        setData(cached.data);
        setHorses(cached.horses || []);
        setSelectedRace(cached.selectedRace || null);
        setLoading(false);
      }
      setProgrammes(cached.programmes || []);
      setSelectedId(nextSelectedId);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeSelectedProgramme((raceId) => {
      if (!raceId) return;
      setSelectedId((current) => (current === raceId ? current : raceId));
    });
  }, []);

  useEffect(() => {
    if (selectedId) setSelectedProgrammeId(selectedId);
  }, [selectedId]);

  const loadProgrammes = useCallback(async () => {
    try {
      const json = await fetchJson<{ races?: ProgrammeSummary[] }>(
        `${API_URL}/api/races?doc_type=programme&limit=100`,
      );
      const list: ProgrammeSummary[] = json.races || [];
      setProgrammes(list);
      const selectedStillExists = selectedId && list.some((p) => p.race_id === selectedId);
      if (!selectedStillExists) {
        const sharedSelectedId = await getSelectedProgrammeId();
        const current =
          list.find((p) => p.race_id === sharedSelectedId) ||
          list.find((p) => p.is_current) ||
          list[0];
        chooseProgramme(current?.race_id || null);
      }
      if (list.length === 0) {
        setLoading(false);
        setRefreshing(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
      setRefreshing(false);
    }
  }, [chooseProgramme, selectedId]);

  const loadRace = useCallback(async (raceId: string) => {
    try {
      const race = await fetchJson<any>(`${API_URL}/api/races/${raceId}`);
      const nextData = {
        experts: race.predictions || [],
        odds: race.odds || [],
        weekly_best: race.weekly_best || { trainers: [], drivers: [] },
        consensus: race.consensus || [],
        classifications: race.classifications || {},
        classement: race.classement || {},
      };
      const nextRace = {
        race_id: race.race_id,
        name: race.name || "Programme",
        date_text: race.date_text || "",
        date_iso: race.date_iso || "",
        location: race.location || "",
        is_current: race.is_current,
      };
      const nextHorses = race.horses || [];
      setSelectedRace(nextRace);
      setData(nextData);
      setHorses(nextHorses);
      writeCache(PRONOSTICS_CACHE_KEY, {
        data: nextData,
        horses: nextHorses,
        programmes,
        selectedId: raceId,
        selectedRace: nextRace,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [programmes]);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    if (selectedId) {
      loadRace(selectedId);
    }
  }, [selectedId, loadRace]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProgrammes();
    if (selectedId) loadRace(selectedId);
  };

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

  const TAB_ORDER: Tab[] = ["experts", "cotes", "semaine", "aptitudes", "classement"];
  const expertsWithPicks = data.experts.filter((e) => (e.picks || []).length > 0);
  const oddsTables = data.odds || [];
  const weeklyBest = data.weekly_best || { trainers: [], drivers: [] };
  const horseNameByNumber = new Map(horses.map((horse) => [horse.number, horse.name]));

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

      {programmes.length > 0 && (
        <View style={styles.programmePicker}>
          <TouchableOpacity
            testID="open-pronostics-calendar"
            onPress={() => {
              haptics.selection();
              setCalendarOpen(true);
            }}
            style={styles.programmePickerButton}
            activeOpacity={0.85}
          >
            <View style={styles.programmePickerIcon}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.brand} />
            </View>
            <View style={styles.programmePickerText}>
              <Text style={styles.programmePickerDate} numberOfLines={1}>
                {selectedRace?.date_text || "Choisir une date"}
              </Text>
              <Text style={styles.programmePickerMeta} numberOfLines={1}>
                {[selectedRace?.name, selectedRace?.location].filter(Boolean).join(" - ")}
              </Text>
            </View>
            {selectedRace?.is_current && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Actuel</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={16} color={theme.colors.brand} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {(
          [
            { k: "experts", label: "Médias" },
            { k: "cotes", label: "Cotes" },
            { k: "semaine", label: "LES MEILLEURS DE LA SEMAINE" },
            { k: "aptitudes", label: "Aptitudes" },
            { k: "classement", label: "Classement" },
          ] as { k: Tab; label: string }[]
        ).map((t) => (
          <TouchableOpacity
            key={t.k}
            testID={`tab-${t.k}`}
            style={[
              styles.tabBtn,
              t.k === "semaine" && styles.tabBtnWide,
              tab === t.k && styles.tabBtnActive,
            ]}
            onPress={() => {
              haptics.selection();
              setTab(t.k);
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === t.k && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <GestureDetector gesture={swipeGesture}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: tabBarHeight + 48 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.brand}
            />
          }
        >
        {tab === "experts" && (
          <View testID="experts-view" key="experts-wrapper">
            <Text style={styles.lead}>
              Les bases de chaque média, classées par ordre de priorité.
            </Text>
            {expertsWithPicks.map((e, i) => (
              <Animated.View
                key={e.source}
                entering={FadeInDown.duration(300).delay(i * 40)}
                style={styles.expertCard}
              >
                <Text style={styles.expertSource}>{e.source}</Text>
                <View style={styles.picksRow}>
                  {e.picks.map((p) => (
                    <TouchableOpacity
                      key={`${e.source}-${p}`}
                      onPress={() => router.push(`/horse/${p}`)}
                      style={styles.pickChip}
                    >
                      <Text style={styles.pickChipText}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            ))}
            {expertsWithPicks.length === 0 && (
              <View style={styles.emptyCat}>
                <Text style={styles.emptyText}>
                  Aucun pronostic media exploitable pour cette course.
                </Text>
              </View>
            )}
          </View>
        )}

        {tab === "cotes" && (
          <View testID="odds-view" key="odds-wrapper">
            <Text style={styles.lead}>
              Cotes extraites des tableaux Paris Turf et Tierce Magazine du PDF.
            </Text>
            {oddsTables.map((table, i) => (
              <Animated.View
                key={table.source}
                entering={FadeInDown.duration(300).delay(i * 40)}
                style={styles.oddsCard}
              >
                <Text style={styles.expertSource}>{table.source}</Text>
                <View style={styles.oddsGrid}>
                  {table.values.map((item) => (
                    <View key={`${table.source}-${item.number}`} style={styles.oddsCell}>
                      <Text style={styles.oddsNumber}>N° {item.number}</Text>
                      <Text style={styles.oddsValue}>{item.odds}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))}
            {oddsTables.length === 0 && (
              <View style={styles.emptyCat}>
                <Text style={styles.emptyText}>
                  Aucune cote Paris Turf ou Tierce Magazine extraite pour cette course.
                </Text>
              </View>
            )}
          </View>
        )}

        {tab === "semaine" && (
          <View testID="weekly-best-view" key="weekly-best-wrapper">
            <Text style={styles.pdfSectionTitle}>LES MEILLEURS DE LA SEMAINE</Text>
            <Text style={styles.lead}>
              Classements extraits de la section Les meilleurs de la semaine du PDF.
            </Text>
            {weeklyBest.trainers.length + weeklyBest.drivers.length > 0 ? (
              <View style={styles.weeklyGrid}>
                <WeeklyBestColumn title="Entraineurs" people={weeklyBest.trainers} />
                <WeeklyBestColumn title="Drivers" people={weeklyBest.drivers} />
              </View>
            ) : (
              <View style={styles.emptyCat}>
                <Text style={styles.emptyText}>
                  Aucun classement hebdomadaire extrait pour cette course.
                </Text>
              </View>
            )}
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
                              style={styles.pickChip}
                            >
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
                  <View style={styles.classementList}>
                    {nums.map((n) => (
                      <TouchableOpacity
                        key={`${cat}-${n}`}
                        onPress={() => router.push(`/horse/${n}`)}
                        style={styles.classementRow}
                      >
                        <View style={styles.classementNumber}>
                          <Text style={styles.classementNumberText}>{n}</Text>
                        </View>
                        <Text style={styles.classementHorseName} numberOfLines={1}>
                          {horseNameByNumber.get(n) || "Cheval non renseigne"}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={theme.colors.textSecondary}
                        />
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

      <Modal
        animationType="fade"
        transparent
        visible={calendarOpen}
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable
          style={calendarStyles.backdrop}
          onPress={() => setCalendarOpen(false)}
        >
          <Pressable
            style={calendarStyles.card}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={calendarStyles.header}>
              <View>
                <Text style={calendarStyles.overline}>Calendrier</Text>
                <Text style={calendarStyles.title}>Choisir une date</Text>
              </View>
              <TouchableOpacity
                testID="close-pronostics-calendar"
                onPress={() => setCalendarOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={selectedRace?.date_iso || undefined}
              markedDates={markedDates}
              onDayPress={(day: { dateString: string }) => {
                const programme = programmes.find((p) => p.date_iso === day.dateString);
                if (programme) {
                  haptics.success();
                  chooseProgramme(programme.race_id);
                  setCalendarOpen(false);
                } else {
                  haptics.warning();
                }
              }}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.gold,
                selectedDayBackgroundColor: theme.colors.brand,
                selectedDayTextColor: "#fff",
                todayTextColor: theme.colors.accent,
                dayTextColor: theme.colors.textPrimary,
                textDisabledColor: "#CCC",
                arrowColor: theme.colors.brand,
                monthTextColor: theme.colors.textPrimary,
                textMonthFontWeight: "800",
                textDayFontWeight: "600",
                textDayHeaderFontWeight: "700",
                dotColor: theme.colors.gold,
                selectedDotColor: "#fff",
              }}
              firstDay={1}
            />
            <Text style={calendarStyles.legend}>
              Les dates avec un point dore ont un programme disponible
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

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

function WeeklyBestColumn({ title, people }: { title: string; people: RankedPerson[] }) {
  return (
    <View style={styles.weeklyColumn}>
      <Text style={styles.weeklyTitle}>{title}</Text>
      {people.length === 0 ? (
        <Text style={styles.weeklyEmpty}>Non extrait</Text>
      ) : (
        people.map((person) => (
          <View key={`${title}-${person.rank}-${person.name}`} style={styles.weeklyRow}>
            <Text style={styles.weeklyRank}>{person.rank}</Text>
            <Text style={styles.weeklyName}>{person.name}</Text>
          </View>
        ))
      )}
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
  programmePicker: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: theme.colors.bg,
  },
  programmePickerButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  programmePickerIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  programmePickerText: {
    flex: 1,
    minWidth: 0,
  },
  programmePickerDate: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  programmePickerMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: theme.colors.gold,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  tabs: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    flexGrow: 0,
    maxHeight: 54,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minWidth: 94,
    alignItems: "center",
  },
  tabBtnWide: {
    minWidth: 210,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tabTextActive: { color: "#fff" },
  scroll: { flex: 1 },
  content: {
    padding: 16,
  },
  lead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  pdfSectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
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
  oddsCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
  },
  oddsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  oddsCell: {
    width: 62,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: 6,
  },
  oddsNumber: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  oddsValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: "900",
    marginTop: 2,
  },
  weeklyGrid: {
    flexDirection: "row",
    gap: 10,
  },
  weeklyColumn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  weeklyTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  weeklyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  weeklyRank: {
    width: 20,
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.gold,
  },
  weeklyName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  weeklyEmpty: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: 16,
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
  pickChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
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
  classementList: {
    gap: 8,
  },
  classementRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  classementNumber: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.brand,
  },
  classementNumberText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
  },
  classementHorseName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
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

const calendarStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 30, 26, 0.52)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  overline: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.gold,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  legend: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 12,
    textAlign: "center",
  },
});
