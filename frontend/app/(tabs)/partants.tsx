import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { theme, API_URL, formatFCFA } from "../../src/theme";
import { haptics } from "../../src/haptics";
import { HorseListSkeleton } from "../../src/Skeleton";

LocaleConfig.locales["fr"] = LocaleConfig.locales["fr"] || {
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

type Horse = {
  number: number;
  name: string;
  jockey: string;
  trainer: string;
  weight: string;
  age: number;
  sex: string;
  perf: string;
  gains_fcfa: number;
};

type ProgrammeSummary = {
  race_id: string;
  name: string;
  date_text: string;
  date_iso: string;
  location: string;
  is_current: boolean;
};

export default function PartantsScreen() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const router = useRouter();

  const selectedProgramme = programmes.find((p) => p.race_id === selectedId);
  const markedDates = useMemo(() => {
    const m: Record<string, any> = {};
    programmes.forEach((p) => {
      if (p.date_iso) {
        m[p.date_iso] = {
          marked: true,
          dotColor: theme.colors.gold,
          selected: p.race_id === selectedId,
          selectedColor: theme.colors.brand,
        };
      }
    });
    return m;
  }, [programmes, selectedId]);

  const loadProgrammes = useCallback(async () => {
    const r = await fetch(`${API_URL}/api/races?doc_type=programme&limit=100`);
    const j = await r.json();
    const list: ProgrammeSummary[] = j.races || [];
    setProgrammes(list);
    return list;
  }, []);

  const load = useCallback(async (raceId?: string | null) => {
    try {
      const qs = raceId ? `?race_id=${encodeURIComponent(raceId)}` : "";
      const r = await fetch(`${API_URL}/api/horses${qs}`);
      const j = await r.json();
      setHorses(j.horses || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await loadProgrammes();
        if (cancelled) return;
        const initial = list.find((p) => p.is_current) || list[0];
        if (initial) {
          setSelectedId(initial.race_id);
        } else {
          await load(null);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, loadProgrammes]);

  useEffect(() => {
    if (selectedId) {
      setSelected([]);
      load(selectedId);
    }
  }, [load, selectedId]);

  const filtered = horses
    .filter(
      (h) =>
        h.name.toLowerCase().includes(query.toLowerCase()) ||
        h.jockey.toLowerCase().includes(query.toLowerCase()) ||
        h.trainer.toLowerCase().includes(query.toLowerCase()) ||
        String(h.number) === query
    )
    .sort((a, b) => a.number - b.number);
  const countLabel = query.trim()
    ? `${filtered.length}/${horses.length} partants`
    : `${horses.length || "—"} partants`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.overline}>{countLabel}</Text>
        <Text style={styles.title}>Les Concurrents</Text>
      </View>

      <View style={styles.controls}>
        {programmes.length > 0 && (
          <TouchableOpacity
            testID="partants-open-calendar"
            onPress={() => {
              haptics.selection();
              setCalendarOpen(true);
            }}
            style={styles.dateBtn}
            activeOpacity={0.85}
          >
            <View style={styles.dateIcon}>
              <Ionicons name="calendar-outline" size={17} color={theme.colors.brand} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.dateText} numberOfLines={1}>
                {selectedProgramme?.date_text || "Choisir une date"}
              </Text>
              <Text style={styles.dateMeta} numberOfLines={1}>
                {selectedProgramme?.location || selectedProgramme?.name || "Programme"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={theme.colors.brand} />
          </TouchableOpacity>
        )}

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
          <TextInput
            testID="search-horses"
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un cheval, jockey, entraîneur..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            testID="toggle-all-details"
            onPress={() => {
              haptics.selection();
              setShowAllDetails((v) => !v);
            }}
            style={[styles.detailsBtn, showAllDetails && styles.detailsBtnActive]}
          >
            <Ionicons
              name={showAllDetails ? "contract-outline" : "expand-outline"}
              size={14}
              color={showAllDetails ? "#fff" : theme.colors.brand}
            />
            <Text
              style={[
                styles.detailsBtnText,
                showAllDetails && styles.detailsBtnTextActive,
              ]}
            >
              {showAllDetails ? "Reduire" : "Tout afficher"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="toggle-compare"
            onPress={() => {
              haptics.medium();
              setCompareMode((v) => !v);
              setSelected([]);
            }}
            style={[styles.compareBtn, compareMode && styles.compareBtnActive]}
          >
            <Ionicons
              name={compareMode ? "close" : "git-compare-outline"}
              size={14}
              color={compareMode ? "#fff" : theme.colors.brand}
            />
            <Text
              style={[
                styles.compareBtnText,
                compareMode && styles.compareBtnTextActive,
              ]}
            >
              {compareMode ? "Quitter" : "Comparer"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View testID="partants-loading">
          <HorseListSkeleton count={6} />
        </View>
      ) : (
        <FlatList
          testID="horses-list"
          data={filtered}
          keyExtractor={(h) => String(h.number)}
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
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.number);
            return (
              <TouchableOpacity
                testID={`horse-row-${item.number}`}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => {
                  if (compareMode) {
                    haptics.selection();
                    setSelected((cur) =>
                      cur.includes(item.number)
                        ? cur.filter((n) => n !== item.number)
                        : cur.length < 4
                        ? [...cur, item.number]
                        : cur
                    );
                  } else {
                    router.push(
                      selectedId
                        ? `/horse/${item.number}?race_id=${encodeURIComponent(selectedId)}`
                        : `/horse/${item.number}`
                    );
                  }
                }}
              >
                <View style={styles.numBox}>
                  <Text style={styles.numText}>{item.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.horseName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.subMeta} numberOfLines={1}>
                    {item.jockey} • {item.trainer}
                  </Text>
                  {showAllDetails && (
                    <View style={styles.detailPanel}>
                      <DetailItem label="Poids" value={item.weight || "-"} />
                      <DetailItem
                        label="Age / sexe"
                        value={`${item.age || "-"}a ${item.sex || ""}`.trim()}
                      />
                      <DetailItem label="Forme" value={item.perf || "-"} mono />
                      <DetailItem
                        label="Gains"
                        value={item.gains_fcfa ? formatFCFA(item.gains_fcfa) : "-"}
                      />
                    </View>
                  )}
                </View>
                {!showAllDetails && item.gains_fcfa > 0 && (
                  <View style={styles.gainsCol}>
                    <Text style={styles.gainsVal}>{formatCompactFCFA(item.gains_fcfa)}</Text>
                    <Text style={styles.gainsLabel}>gains</Text>
                  </View>
                )}
                {compareMode ? (
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Floating action bar in compare mode */}
      {compareMode && selected.length > 0 && (
        <View style={styles.compareBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.compareBarText}>
              {selected.length} sélectionné{selected.length > 1 ? "s" : ""} •{" "}
              #{selected.join(" · #")}
            </Text>
            <Text style={styles.compareBarHint}>
              Sélectionnez 2 à 4 chevaux pour comparer
            </Text>
          </View>
          <TouchableOpacity
            testID="compare-go"
            disabled={selected.length < 2}
            style={[
              styles.compareGo,
              selected.length < 2 && { opacity: 0.4 },
            ]}
            onPress={() => {
              haptics.success();
              router.push(
                selectedId
                  ? `/compare?ids=${selected.join(",")}&race_id=${encodeURIComponent(selectedId)}`
                  : `/compare?ids=${selected.join(",")}`
              );
            }}
          >
            <Text style={styles.compareGoText}>Comparer</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={calendarOpen}
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable style={styles.calendarBackdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.calendarCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.calendarOverline}>Calendrier</Text>
                <Text style={styles.calendarTitle}>Choisir une date</Text>
              </View>
              <TouchableOpacity onPress={() => setCalendarOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={selectedProgramme?.date_iso || undefined}
              markedDates={markedDates}
              onDayPress={(day: { dateString: string }) => {
                const programme = programmes.find((p) => p.date_iso === day.dateString);
                if (programme) {
                  haptics.success();
                  setSelectedId(programme.race_id);
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
                arrowColor: theme.colors.brand,
                monthTextColor: theme.colors.textPrimary,
                textDayFontWeight: "600",
                textMonthFontWeight: "800",
                textDayHeaderFontWeight: "700",
              }}
              firstDay={1}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.detailValueMono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function formatCompactFCFA(value: number) {
  if (value >= 1000000) {
    return `${Math.round(value / 100000) / 10}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return `${value}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
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
    fontSize: 28,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  controls: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  dateIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 46, 26, 0.08)",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  dateMeta: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  search: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  detailsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.surface,
  },
  detailsBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.brand,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailsBtnTextActive: {
    color: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  sep: { height: 10 },
  numBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  horseName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  subMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailPanel: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  detailItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: 9,
    color: theme.colors.gold,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: "600",
    lineHeight: 16,
  },
  detailValueMono: {
    fontFamily: "Courier",
    letterSpacing: 0.4,
  },
  gainsCol: { alignItems: "center", minWidth: 46 },
  gainsVal: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.gold,
  },
  gainsLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  // ---- Compare mode ----
  compareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.surface,
  },
  compareBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  compareBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.brand,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  compareBtnTextActive: {
    color: "#fff",
  },
  rowSelected: {
    backgroundColor: "rgba(10, 46, 26, 0.06)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  compareBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.brand,
    borderWidth: 1,
    borderColor: theme.colors.brand,
  },
  compareBarText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },
  compareBarHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  compareGo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.gold,
  },
  compareGoText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  calendarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 30, 26, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarOverline: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: theme.colors.gold,
    fontWeight: "800",
  },
  calendarTitle: {
    marginTop: 2,
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: "800",
  },
});

