import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { theme, API_URL, ADMIN_WEB_URL, formatFCFA } from "../src/theme";
import { readCache, writeCache } from "../src/storageCache";
import { fetchJson } from "../src/apiClient";

LocaleConfig.locales["fr"] = {
  monthNames: [
    "Janvier",
    "Fevrier",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Aout",
    "Septembre",
    "Octobre",
    "Novembre",
    "Decembre",
  ],
  monthNamesShort: [
    "Janv.",
    "Fevr.",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juil.",
    "Aout",
    "Sept.",
    "Oct.",
    "Nov.",
    "Dec.",
  ],
  dayNames: [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ],
  dayNamesShort: ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = "fr";

type ResultRace = {
  race_id: string;
  doc_type: string;
  name: string;
  event_type: string;
  date_text: string;
  date_iso: string;
  location: string;
  runners: number;
  finishing_order: number[];
  top_payout: { type: string; amount_fcfa: number; label: string } | null;
};

const RESULTS_CACHE_KEY = "pmub.resultats.v1";

function placeLabel(index: number) {
  if (index === 0) return "1er";
  return `${index + 1}e`;
}

export default function ResultatsScreen() {
  const [races, setRaces] = useState<ResultRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);
  const hasResultsRef = useRef(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const j = await fetchJson<{ races?: ResultRace[] }>(
        `${API_URL}/api/races?has_results=true&limit=100`,
      );
      const list: ResultRace[] = j.races || [];
      setRaces(list);
      setNetworkNotice(null);
      writeCache(RESULTS_CACHE_KEY, list);
    } catch (e) {
      console.error(e);
      setNetworkNotice(
        hasResultsRef.current
          ? "Connexion lente - donnees recentes affichees"
          : "Connexion lente - reessayez dans un instant"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    hasResultsRef.current = races.length > 0;
  }, [races.length]);

  useEffect(() => {
    let mounted = true;
    readCache<ResultRace[]>(RESULTS_CACHE_KEY).then((cached) => {
      if (!mounted || !cached) return;
      setRaces(cached);
      setLoading(false);
      if (cached.length > 0) {
        setNetworkNotice("Donnees recentes affichees");
      }
    });
    load();
    return () => {
      mounted = false;
    };
  }, [load]);

  const dateOptions = useMemo(() => {
    const seen = new Set<string>();
    return races
      .filter((race) => {
        if (!race.date_iso || seen.has(race.date_iso)) return false;
        seen.add(race.date_iso);
        return true;
      })
      .map((race) => ({
        date_iso: race.date_iso,
        date_text: race.date_text,
      }));
  }, [races]);

  const filteredRaces = useMemo(() => {
    if (!selectedDate) return races;
    return races.filter((race) => race.date_iso === selectedDate);
  }, [races, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "Calendrier";
    return (
      dateOptions.find((date) => date.date_iso === selectedDate)?.date_text ||
      selectedDate
    );
  }, [dateOptions, selectedDate]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    dateOptions.forEach((date) => {
      marks[date.date_iso] = {
        marked: true,
        dotColor: theme.colors.gold,
        selected: date.date_iso === selectedDate,
        selectedColor: theme.colors.brand,
      };
    });
    return marks;
  }, [dateOptions, selectedDate]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="results-home-btn"
          onPress={() => router.push("/")}
          style={styles.homeBtn}
          hitSlop={10}
        >
          <Ionicons name="home-outline" size={18} color={theme.colors.brand} />
          <Text style={styles.homeText}>Accueil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.overline}>Après la course</Text>
        <Text style={styles.title}>Résultats officiels</Text>
        <Text style={styles.lead}>
          Ordre d&apos;arrivée officiel et rapports (Ordre, Désordre, Bonus,
          Couplé, Tiercé, Quarté+, Quinté+) en F CFA. Données importées depuis
          les PDF de courses ou de résultats.
        </Text>
      </View>

      {networkNotice && (
        <View style={styles.notice} testID="results-network-notice">
          <Ionicons name="cloud-offline-outline" size={15} color={theme.colors.gold} />
          <Text style={styles.noticeText}>{networkNotice}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand} />
      ) : (
        <FlatList
          testID="resultats-list"
          data={filteredRaces}
          keyExtractor={(r) => r.race_id}
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            dateOptions.length > 0 ? (
              <View style={styles.dateFilterWrap}>
                <Text style={styles.dateFilterLabel}>Choisir une date</Text>
                <View style={styles.dateFilterActions} testID="results-date-filter">
                  <TouchableOpacity
                    testID="results-date-all"
                    onPress={() => setSelectedDate(null)}
                    style={[
                      styles.dateResetBtn,
                      !selectedDate && styles.dateResetBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateResetText,
                        !selectedDate && styles.dateResetTextActive,
                      ]}
                    >
                      Toutes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="open-results-calendar"
                    onPress={() => setCalendarOpen(true)}
                    style={styles.calendarBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="calendar-outline" size={18} color={theme.colors.brand} />
                    <Text style={styles.calendarBtnText} numberOfLines={1}>
                      {selectedDateLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.brand} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={36} color={theme.colors.gold} />
              <Text style={styles.emptyTitle}>Aucun résultat publié</Text>
              <Text style={styles.emptyText}>
                Les résultats présents dans les PDF de courses ou les PDF de
                résultats importés via l&apos;admin apparaîtront ici.
              </Text>
              <TouchableOpacity
                testID="go-admin-empty"
                style={styles.adminBtn}
                onPress={() => Linking.openURL(ADMIN_WEB_URL)}
              >
                <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                <Text style={styles.adminBtnText}>Espace admin</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View
              testID={`result-card-${item.race_id}`}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.event_type || "Résultat"}</Text>
                </View>
                <Text style={styles.dateText}>{item.date_text}</Text>
              </View>
              <Text style={styles.raceName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.location}>
                <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                {"  "}
                {item.location}
              </Text>

              <View style={styles.resultSectionHeader}>
                <Text style={styles.resultSectionTitle}>Arrivee officielle</Text>
                <Text style={styles.resultSectionHint}>
                  {item.finishing_order.length} classe
                  {item.finishing_order.length > 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.podiumRow}>
                {item.finishing_order.slice(0, 5).map((n, idx) => (
                  <View
                    key={`${item.race_id}-${idx}`}
                    style={[
                      styles.podiumItem,
                      idx === 0 && styles.podiumItemFirst,
                      idx === 1 && styles.podiumItemSecond,
                      idx === 2 && styles.podiumItemThird,
                    ]}
                  >
                    <Text style={styles.podiumPlace}>{placeLabel(idx)}</Text>
                    <Text style={styles.podiumNum}>{n}</Text>
                  </View>
                ))}
              </View>

              {item.top_payout && (
                <View style={styles.payoutRow}>
                  <View style={styles.payoutIcon}>
                    <Ionicons name="cash-outline" size={15} color={theme.colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payoutLabel}>Rapport principal</Text>
                    <Text style={styles.payoutText} numberOfLines={1}>
                      {item.top_payout.label || item.top_payout.type} -{" "}
                      {formatFCFA(item.top_payout.amount_fcfa)}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                testID={`result-reports-${item.race_id}`}
                style={styles.ctaRow}
                onPress={() =>
                  router.push({
                    pathname: "/race/[race_id]",
                    params: { race_id: item.race_id, from: "resultats" },
                  })
                }
                activeOpacity={0.85}
              >
                <View style={styles.ctaLabelRow}>
                  <Ionicons name="document-text-outline" size={16} color={theme.colors.brand} />
                  <Text style={styles.ctaText}>Voir tous les rapports</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.brand} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable
          style={calendarStyles.backdrop}
          onPress={() => setCalendarOpen(false)}
        >
          <Pressable
            style={calendarStyles.card}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={calendarStyles.header}>
              <Text style={calendarStyles.title}>Choisir une date</Text>
              <TouchableOpacity
                testID="close-results-calendar"
                onPress={() => setCalendarOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={selectedDate || dateOptions[0]?.date_iso}
              firstDay={1}
              markedDates={markedDates}
              onDayPress={(day) => {
                const hasResults = dateOptions.some(
                  (date) => date.date_iso === day.dateString
                );
                if (!hasResults) return;
                setSelectedDate(day.dateString);
                setCalendarOpen(false);
              }}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                selectedDayBackgroundColor: theme.colors.brand,
                todayTextColor: theme.colors.brand,
                arrowColor: theme.colors.brand,
                dotColor: theme.colors.gold,
                textDayFontWeight: "600",
                textMonthFontWeight: "800",
                textDayHeaderFontWeight: "700",
              }}
            />
            <Text style={calendarStyles.legend}>
              Les dates marquees ont des resultats disponibles.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  headerBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  homeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  homeText: { fontSize: 13, fontWeight: "700", color: theme.colors.brand, marginLeft: 4 },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
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
  lead: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 17 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  dateFilterWrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  dateFilterLabel: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  dateFilterActions: {
    flexDirection: "row",
    gap: 8,
  },
  dateResetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minWidth: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  dateResetBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  dateResetText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  dateResetTextActive: {
    color: "#fff",
  },
  calendarBtn: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calendarBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  empty: { alignItems: "center", padding: 40, marginTop: 20 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
    maxWidth: 300,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: theme.colors.brand,
  },
  adminBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginTop: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.brand,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  raceName: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  location: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  resultSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  resultSectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.gold,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  resultSectionHint: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  podiumRow: { flexDirection: "row", gap: 6 },
  podiumItem: {
    flex: 1,
    alignItems: "center",
    minHeight: 58,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  podiumItemFirst: {
    borderColor: theme.colors.gold,
    backgroundColor: "#FBF7EC",
  },
  podiumItemSecond: {
    borderColor: "#C8C8C8",
  },
  podiumItemThird: {
    borderColor: "#CBA47A",
  },
  podiumPlace: {
    fontSize: 9,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  podiumNum: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  payoutIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  payoutLabel: {
    fontSize: 9,
    color: theme.colors.gold,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  payoutText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.surfaceAlt,
  },
  ctaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.brand,
    letterSpacing: 1,
    textTransform: "uppercase",
    flexShrink: 1,
  },
});

const calendarStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.42)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  legend: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
