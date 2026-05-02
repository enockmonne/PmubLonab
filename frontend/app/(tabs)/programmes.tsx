import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, API_URL, formatFCFA, formatEuro } from "../../src/theme";

type RaceData = {
  race: {
    id: string;
    name: string;
    event_type: string;
    date: string;
    location: string;
    discipline: string;
    distance_m: number;
    runners: number;
    prize_euros: number;
    prize_fcfa: number;
    hero_image: string;
    editorial_synthesis?: string;
  };
  betting: {
    arret_jeux_weekend: string;
    daylight_saving_note: string;
  };
  top_picks: { number: number; score: number; appearances: number }[];
};

type ProgrammeSummary = {
  race_id: string;
  name: string;
  date_text: string;
  date_iso: string;
  location: string;
  is_current: boolean;
};

export default function RaceScreen() {
  const [data, setData] = useState<RaceData | null>(null);
  const [programmes, setProgrammes] = useState<ProgrammeSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Load the list of all available programmes
  const loadProgrammes = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/races?doc_type=programme&limit=100`);
      const j = await r.json();
      const list: ProgrammeSummary[] = j.races || [];
      setProgrammes(list);
      if (!selectedId) {
        const current = list.find((p) => p.is_current) || list[0];
        if (current) setSelectedId(current.race_id);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedId]);

  // Load one programme's full data (by id)
  const loadRace = useCallback(async (raceId: string) => {
    try {
      const r = await fetch(`${API_URL}/api/races/${raceId}`);
      const full = await r.json();
      // also fetch /api/race for consistent shape (top_picks + betting) when it's the current
      const isCurrent = programmes.find((p) => p.race_id === raceId)?.is_current;
      let adapted: RaceData;
      if (isCurrent) {
        const cur = await fetch(`${API_URL}/api/race`).then((x) => x.json());
        adapted = cur;
      } else {
        const top = (full.consensus || []).slice(0, 3);
        adapted = {
          race: {
            id: full.race_id,
            name: full.name,
            event_type: full.event_type,
            date: full.date_text,
            location: full.location,
            discipline: full.discipline,
            distance_m: full.distance_m,
            runners: full.runners,
            prize_euros: full.prize_euros,
            prize_fcfa: full.prize_fcfa,
            hero_image: full.hero_image,
            editorial_synthesis: full.editorial_synthesis || "",
          },
          betting: {
            arret_jeux_weekend: "13h 05mn",
            daylight_saving_note: "",
          },
          top_picks: top,
        };
      }
      setData(adapted);
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
      setLoading(true);
      loadRace(selectedId);
    }
  }, [selectedId, loadRace]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProgrammes();
    if (selectedId) loadRace(selectedId);
  };

  if (loading || !data) {
    return (
      <View style={styles.loader} testID="race-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const { race, betting, top_picks } = data;
  const isCurrentRace = !!programmes.find(
    (p) => p.race_id === selectedId && p.is_current
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        testID="race-screen"
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand}
          />
        }
      >
        {/* Masthead */}
        <View style={styles.masthead}>
          <Text style={styles.mastheadOverline}>Le Journal Hippique</Text>
          <Text style={styles.mastheadTitle}>PMU&apos;B</Text>
          <View style={styles.mastheadRule} />
          <Text style={styles.mastheadDate}>{race.date}</Text>
        </View>

        {/* Date picker — scroll horizontal */}
        {programmes.length > 0 && (
          <View style={datePicker.wrap}>
            <Text style={datePicker.label}>Choisir une date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={datePicker.scroll}
              testID="date-picker-scroll"
            >
              {programmes.map((p) => {
                const active = p.race_id === selectedId;
                const dateParts = (p.date_iso || "").split("-");
                const day = dateParts[2] || "--";
                const month = dateParts[1]
                  ? new Date(p.date_iso).toLocaleString("fr-FR", { month: "short" }).toUpperCase()
                  : "";
                const year = dateParts[0] || "";
                return (
                  <TouchableOpacity
                    key={p.race_id}
                    testID={`date-chip-${p.race_id}`}
                    activeOpacity={0.75}
                    style={[datePicker.chip, active && datePicker.chipActive]}
                    onPress={() => setSelectedId(p.race_id)}
                  >
                    <Text style={[datePicker.chipDay, active && datePicker.chipDayActive]}>
                      {day}
                    </Text>
                    <Text style={[datePicker.chipMonth, active && datePicker.chipMonthActive]}>
                      {month} {year.slice(-2)}
                    </Text>
                    <Text
                      style={[datePicker.chipLoc, active && datePicker.chipLocActive]}
                      numberOfLines={1}
                    >
                      {p.location || "—"}
                    </Text>
                    {p.is_current && <View style={datePicker.dot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: race.hero_image }} style={styles.heroImg} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEvent}>{race.event_type}</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {race.name}
            </Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              <Text style={styles.heroMeta}>{race.location}</Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <Stat label="Discipline" value={race.discipline} />
          <Stat label="Distance" value={`${race.distance_m} m`} />
          <Stat label="Partants" value={`${race.runners}`} />
          <Stat
            label="Allocation"
            value={formatEuro(race.prize_euros)}
            subValue={formatFCFA(race.prize_fcfa)}
          />
        </View>

        {/* Editorial synthesis */}
        {race.editorial_synthesis && race.editorial_synthesis.length > 20 && (
          <View style={styles.section} testID="editorial-synthesis">
            <Text style={styles.sectionOverline}>Synthèse de la rédaction</Text>
            <Text style={styles.sectionTitle}>L&apos;analyse</Text>
            <View style={synthStyles.card}>
              <View style={synthStyles.quoteMark}>
                <Text style={synthStyles.quoteMarkText}>“</Text>
              </View>
              <Text style={synthStyles.body}>
                {race.editorial_synthesis}
              </Text>
              <View style={synthStyles.signature}>
                <View style={synthStyles.rule} />
                <Text style={synthStyles.signatureText}>La rédaction · PMU&apos;B</Text>
              </View>
            </View>
          </View>
        )}

        {/* Top picks */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>Consensus Expert</Text>
          <Text style={styles.sectionTitle}>Le Trio de Tête</Text>
          <Text style={styles.sectionLead}>
            Synthèse de 7 pronostiqueurs — ParisTurf, Voix du Nord, Turf-fr.com,
            Turfomania, Le Parisien, L&apos;Alsace, Zone-Turf.fr.
          </Text>
          <View style={styles.podium}>
            {top_picks.map((p, idx) => {
              const isFirst = idx === 0;
              return (
                <TouchableOpacity
                  key={p.number}
                  testID={`top-pick-${p.number}`}
                  style={[styles.podiumCard, isFirst && styles.podiumCardFirst]}
                  onPress={() => router.push(`/horse/${p.number}`)}
                >
                  <Text style={[styles.podiumRank, isFirst && { color: theme.colors.gold }]}>
                    {idx === 0 ? "1er" : idx === 1 ? "2e" : "3e"}
                  </Text>
                  <View
                    style={[
                      styles.podiumNum,
                      isFirst && { backgroundColor: theme.colors.gold },
                    ]}
                  >
                    <Text style={styles.podiumNumText}>{p.number}</Text>
                  </View>
                  <Text style={[styles.podiumScore, isFirst && { color: "#fff" }]}>
                    {p.score} pts
                  </Text>
                  <Text style={[styles.podiumMentions, isFirst && { color: "rgba(255,255,255,0.7)" }]}>
                    {p.appearances}/7 médias
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Betting info — uniquement pour la course courante */}
        {isCurrentRace && (
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>Arrêt des jeux</Text>
          <View style={styles.infoCard}>
            <Ionicons
              name="time-outline"
              size={20}
              color={theme.colors.brand}
            />
            <Text style={styles.infoCardText}>
              Dimanche — {betting.arret_jeux_weekend}
            </Text>
          </View>
          {!!betting.daylight_saving_note && (
            <Text style={styles.daylightNote}>{betting.daylight_saving_note}</Text>
          )}

          {/* Official information banner */}
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerHeader}>
              <Ionicons
                name="information-circle"
                size={18}
                color={theme.colors.gold}
              />
              <Text style={styles.infoBannerTitle}>Information</Text>
            </View>
            <Text style={styles.infoBannerBody}>
              Le passage de l’heure d’hiver à l’heure d’été («&nbsp;GMT+1&nbsp;» à
              «&nbsp;GMT+2&nbsp;») en France interviendra dans la nuit du samedi
              28 au dimanche 29 mars 2026. En conséquence, les heures d’arrêt
              de jeu PMU’B sont revues ainsi qu’il suit dans toutes les
              représentations de la LONAB, à compter du dimanche 29 mars 2026
              et ce, jusqu’à nouvel ordre :
            </Text>

            <View style={styles.scheduleCard}>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleDay}>
                  Lundi, Mardi, Mercredi, Jeudi et Vendredi
                </Text>
                <Text style={styles.scheduleTime}>11h 45mn</Text>
              </View>
              <View style={styles.scheduleDivider} />
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleDay}>Samedi et Dimanche</Text>
                <Text style={styles.scheduleTime}>13h 05mn</Text>
              </View>
              <View style={styles.scheduleDivider} />
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleDay}>Course nocturne</Text>
                <Text style={styles.scheduleTime}>18h 05mn</Text>
              </View>
            </View>
          </View>
        </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subValue ? <Text style={styles.statSub}>{subValue}</Text> : null}
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
  scroll: { paddingBottom: 24 },
  masthead: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.bg,
  },
  mastheadOverline: {
    fontSize: 11,
    letterSpacing: 3,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  mastheadTitle: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 42,
    fontWeight: "900",
    color: theme.colors.brand,
    letterSpacing: -1,
    marginTop: 2,
  },
  mastheadRule: {
    height: 1,
    backgroundColor: theme.colors.border,
    width: "60%",
    marginVertical: 10,
  },
  mastheadDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  hero: {
    marginHorizontal: 16,
    height: 220,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,46,26,0.55)",
  },
  heroContent: {
    position: "absolute",
    bottom: 18,
    left: 18,
    right: 18,
  },
  heroEvent: {
    color: theme.colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    color: "#fff",
    fontFamily: theme.fonts.serifBlack,
    fontSize: 30,
    letterSpacing: -0.7,
    lineHeight: 34,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  heroMeta: { color: "#fff", fontSize: 13, marginLeft: 4 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    marginHorizontal: 16,
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
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: "700",
    marginTop: 4,
  },
  statSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  section: { marginTop: 28, paddingHorizontal: 16 },
  sectionOverline: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 26,
    color: theme.colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.6,
  },
  sectionLead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 19,
  },
  podium: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  podiumCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  podiumCardFirst: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  podiumRank: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  podiumNum: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  podiumNumText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  podiumScore: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  podiumMentions: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginTop: 12,
    gap: 10,
  },
  infoCardText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginLeft: 10,
  },
  daylightNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 10,
    lineHeight: 17,
    fontStyle: "italic",
  },
  infoBanner: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
  },
  infoBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  infoBannerTitle: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoBannerBody: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  scheduleCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  scheduleDay: {
    flex: 1,
    fontSize: 12.5,
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  scheduleTime: {
    fontSize: 13,
    color: theme.colors.brand,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});

const datePicker = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  scroll: {
    paddingRight: 16,
    gap: 8,
  },
  chip: {
    width: 76,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    marginRight: 8,
    position: "relative",
  },
  chipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  chipDay: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  chipDayActive: { color: "#fff" },
  chipMonth: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  chipMonthActive: { color: theme.colors.gold },
  chipLoc: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    marginTop: 4,
    maxWidth: 64,
    textAlign: "center",
  },
  chipLocActive: { color: "rgba(255,255,255,0.8)" },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.gold,
  },
});

const synthStyles = StyleSheet.create({
  card: {
    marginTop: 14,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: "relative",
  },
  quoteMark: {
    position: "absolute",
    top: -8,
    left: 16,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 6,
  },
  quoteMarkText: {
    fontSize: 42,
    lineHeight: 42,
    color: theme.colors.gold,
    fontWeight: "800",
    fontFamily: "Georgia",
  },
  body: {
    fontSize: 14,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    fontStyle: "italic",
    fontFamily: "Georgia",
    letterSpacing: 0.1,
  },
  signature: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rule: {
    width: 28,
    height: 1,
    backgroundColor: theme.colors.gold,
  },
  signatureText: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
