import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { API_URL } from "../../src/theme";
import { minimalTheme as c, mono, sans } from "../../src/minimalTheme";

type ResultRace = {
  race_id: string;
  doc_type: string;
  name: string;
  event_type: string;
  date_text: string;
  date_iso: string;
  location: string;
  finishing_order: number[];
  top_payout: { type: string; amount_fcfa: number; label: string } | null;
};

const FILTERS = ["Tout", "QUARTE+", "TIERCE", "QUINTE+", "COUPLE"];

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const pad2 = (n: number) => String(n).padStart(2, "0");

export default function V2Resultats() {
  const router = useRouter();
  const [races, setRaces] = useState<ResultRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Tout");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/races?doc_type=result&limit=100`);
        const j = await r.json();
        setRaces(j.races || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered =
    filter === "Tout"
      ? races
      : races.filter((r) => (r.event_type || "").toUpperCase().includes(filter));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} testID="v2-resultats">
        {/* Header bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="v2-home-btn"
            onPress={() => router.push("/v2")}
            style={styles.homeLink}
          >
            <Text style={styles.homeArrow}>←</Text>
            <Text style={styles.homeText}>ACCUEIL</Text>
          </TouchableOpacity>
          <Text style={styles.crumbLabel}>02 / RÉSULTATS</Text>
        </View>

        {/* Title */}
        <View style={{ marginTop: 36 }}>
          <Text style={styles.kicker}>APRÈS LA COURSE</Text>
          <Text style={styles.title}>
            Résultats{"\n"}
            <Text style={styles.titleBold}>officiels</Text>
          </Text>
          <Text style={styles.lead}>
            Ordre d&apos;arrivée et rapports Ordre, Désordre, Bonus, Couplé,
            Quarté+ et Quinté+ en F CFA.
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              testID={`v2-filter-${f}`}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, filter === f && styles.chipTextActive]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={c.ink} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptySub}>
              Les prochains PDF importés apparaîtront ici.
            </Text>
          </View>
        ) : (
          filtered.map((r) => <ResultItem key={r.race_id} race={r} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultItem({ race }: { race: ResultRace }) {
  const router = useRouter();
  const isQuarte = (race.event_type || "").toUpperCase().includes("QUARTE");
  const dateParts = race.date_iso?.split("-") || [];
  const dateCompact =
    dateParts.length === 3
      ? `${dateParts[2]} · ${dateParts[1]} · ${dateParts[0]}`
      : race.date_text;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={styles.item}
      onPress={() => router.push(`/race/${race.race_id}`)}
      testID={`v2-result-${race.race_id}`}
    >
      <View style={styles.itemTop}>
        <View style={[styles.pill, isQuarte && styles.pillDark]}>
          <Text style={[styles.pillText, isQuarte && styles.pillTextDark]}>
            {race.event_type || "RÉSULTAT"}
          </Text>
        </View>
        <Text style={styles.date}>{dateCompact}</Text>
      </View>

      <Text style={styles.raceName}>{race.name}</Text>
      <Text style={styles.location}>{race.location}</Text>

      {race.finishing_order && race.finishing_order.length > 0 && (
        <View style={styles.finishers}>
          {race.finishing_order.slice(0, 5).map((num, idx, arr) => (
            <React.Fragment key={idx}>
              <Text style={styles.fpos}>{idx + 1}</Text>
              <Text style={styles.fnum}>{pad2(num)}</Text>
              {idx < arr.length - 1 && <Text style={styles.fsep}>·</Text>}
            </React.Fragment>
          ))}
        </View>
      )}

      {race.top_payout && (
        <View style={styles.payout}>
          <Text style={styles.payType}>
            {(race.top_payout.type || "").toUpperCase()}
            {race.top_payout.label ? `  ·  ${race.top_payout.label.toUpperCase()}` : ""}
          </Text>
          <Text style={styles.payAmt}>
            {fmt(race.top_payout.amount_fcfa)}
            <Text style={styles.payCur}> F CFA</Text>
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 60 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  homeLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  homeArrow: {
    fontSize: 13,
    color: c.subtle,
    fontWeight: "400",
    fontFamily: sans,
  },
  homeText: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: c.ink,
    fontWeight: "700",
    fontFamily: sans,
  },
  crumbLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: c.subtle,
    fontWeight: "600",
    fontFamily: sans,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 2,
    color: c.subtle,
    fontWeight: "600",
    fontFamily: mono,
  },
  title: {
    marginTop: 10,
    fontSize: 46,
    lineHeight: 46,
    fontWeight: "300",
    letterSpacing: -1.7,
    color: c.ink,
    fontFamily: sans,
  },
  titleBold: {
    fontWeight: "800",
    fontStyle: "italic",
  },
  lead: {
    marginTop: 14,
    fontSize: 13,
    color: c.muted,
    lineHeight: 20,
    maxWidth: 340,
    fontFamily: sans,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  chipText: {
    fontSize: 10,
    color: c.muted,
    fontWeight: "600",
    fontFamily: mono,
    letterSpacing: 0.5,
  },
  chipTextActive: { color: "#fff" },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "300",
    color: c.ink,
    letterSpacing: -0.5,
    fontFamily: sans,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 12,
    color: c.muted,
    fontFamily: sans,
  },
  item: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: c.ink,
  },
  pillDark: {
    backgroundColor: c.ink,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: c.ink,
    fontFamily: mono,
  },
  pillTextDark: { color: "#fff" },
  date: {
    fontSize: 11,
    color: c.subtle,
    letterSpacing: 0.4,
    fontFamily: mono,
  },
  raceName: {
    fontSize: 26,
    fontWeight: "300",
    letterSpacing: -0.8,
    color: c.ink,
    fontFamily: sans,
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: c.muted,
    marginTop: 5,
    fontFamily: sans,
  },
  finishers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    flexWrap: "wrap",
  },
  fpos: {
    fontSize: 9,
    color: c.subtle,
    letterSpacing: 0.5,
    fontFamily: mono,
  },
  fnum: {
    fontSize: 16,
    fontWeight: "700",
    color: c.ink,
    fontFamily: mono,
  },
  fsep: {
    fontSize: 13,
    color: "#D0D0D0",
    fontFamily: mono,
  },
  payout: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: c.line,
    borderStyle: "dashed",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  payType: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: c.subtle,
    fontWeight: "700",
    fontFamily: sans,
    flex: 1,
  },
  payAmt: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.5,
    color: c.ink,
    fontFamily: mono,
  },
  payCur: {
    fontSize: 10,
    color: c.subtle,
    fontWeight: "400",
    letterSpacing: 0.5,
  },
});
