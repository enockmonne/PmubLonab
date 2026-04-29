import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { API_URL } from "../../src/theme";
import { minimalTheme as c, mono, sans } from "../../src/minimalTheme";

export default function V2Landing() {
  const router = useRouter();
  const [counts, setCounts] = useState<{ programmes: number; resultats: number }>({
    programmes: 0,
    resultats: 0,
  });
  const [current, setCurrent] = useState<{ name: string; location: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [progRes, resRes, raceRes] = await Promise.all([
          fetch(`${API_URL}/api/races?limit=100`).then((r) => r.json()),
          fetch(`${API_URL}/api/races?doc_type=result&limit=100`).then((r) => r.json()),
          fetch(`${API_URL}/api/race`).then((r) => r.json()),
        ]);
        setCounts({
          programmes: (progRes.races || []).length,
          resultats: (resRes.races || []).length,
        });
        setCurrent({
          name: raceRes.race?.name || "",
          location: raceRes.race?.location || "",
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} testID="v2-landing">
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.liveWrap}>
            <View style={styles.dot} />
            <Text style={styles.topTiny}>LIVE</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              testID="v2-back-v1"
              onPress={() => router.replace("/")}
              style={styles.versionPill}
            >
              <Text style={styles.versionPillText}>V1 ←</Text>
            </TouchableOpacity>
            <Text style={styles.topTiny}>DIM. 12 AVR. 2026</Text>
          </View>
        </View>

        {/* Brand */}
        <Text style={styles.brand}>
          PMU<Text style={styles.brandAccent}>&apos;</Text>B
        </Text>
        <Text style={styles.brandSub}>
          Le Journal Hippique — analyses, pronostics et résultats officiels.
        </Text>

        {/* Today info */}
        <View style={styles.today}>
          <Text style={styles.todayText} numberOfLines={1}>
            <Text style={styles.todayBold}>
              {current?.name || "Course du jour"}
            </Text>
            {"  ·  "}
            {current?.location || "—"}
          </Text>
          <Text style={styles.todayText}>13h 05</Text>
        </View>

        {/* Section 01 / Programmes */}
        <TouchableOpacity
          testID="v2-go-programmes"
          activeOpacity={0.7}
          style={[styles.row, styles.rowFirst]}
          onPress={() => router.push("/(tabs)/programmes")}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>01 / PROGRAMMES</Text>
            <Text style={styles.rowTitle}>À venir</Text>
            <Text style={styles.rowMeta}>
              Course du jour, partants, 7 pronostics experts agrégés en consensus.
            </Text>
          </View>
          <View style={styles.rowRight}>
            {loading ? (
              <ActivityIndicator color={c.ink} />
            ) : (
              <Text style={styles.count}>{pad(counts.programmes)}</Text>
            )}
            <Text style={styles.countLabel}>COURSES</Text>
            <Text style={styles.arrow}>
              Entrer <Text style={styles.arrowSep}>→</Text>
            </Text>
          </View>
        </TouchableOpacity>

        {/* Section 02 / Résultats */}
        <TouchableOpacity
          testID="v2-go-resultats"
          activeOpacity={0.7}
          style={styles.row}
          onPress={() => router.push("/v2/resultats")}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>02 / RÉSULTATS</Text>
            <Text style={styles.rowTitle}>Officiels</Text>
            <Text style={styles.rowMeta}>
              Ordre d&apos;arrivée et rapports Ordre/Désordre/Couplé/Quarté+ en F CFA.
            </Text>
          </View>
          <View style={styles.rowRight}>
            {loading ? (
              <ActivityIndicator color={c.ink} />
            ) : (
              <Text style={styles.count}>{pad(counts.resultats)}</Text>
            )}
            <Text style={styles.countLabel}>DISPO.</Text>
            <Text style={styles.arrow}>
              Consulter <Text style={styles.arrowSep}>→</Text>
            </Text>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>BURKINA FASO · V2</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={styles.kbd}><Text style={styles.kbdText}>⌘</Text></View>
            <View style={styles.kbd}><Text style={styles.kbdText}>K</Text></View>
            <Text style={styles.footerText}>RECHERCHE</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  liveWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.accent,
  },
  topTiny: {
    fontSize: 10,
    letterSpacing: 2,
    color: c.subtle,
    fontWeight: "600",
    fontFamily: sans,
  },
  versionPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 4,
  },
  versionPillText: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: c.ink,
    fontWeight: "700",
    fontFamily: mono,
  },
  brand: {
    marginTop: 48,
    fontSize: 62,
    lineHeight: 62,
    fontWeight: "200",
    letterSpacing: -2.5,
    color: c.ink,
    fontFamily: sans,
  },
  brandAccent: {
    fontWeight: "800",
    fontStyle: "italic",
  },
  brandSub: {
    marginTop: 14,
    fontSize: 13,
    color: c.muted,
    lineHeight: 20,
    maxWidth: 300,
    fontFamily: sans,
  },
  today: {
    marginTop: 30,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: c.line,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todayText: {
    fontSize: 11,
    color: c.muted,
    fontFamily: mono,
    letterSpacing: 0.3,
  },
  todayBold: {
    color: c.ink,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  rowFirst: {
    marginTop: 36,
  },
  rowLabel: {
    fontSize: 10,
    letterSpacing: 2.2,
    color: c.subtle,
    fontWeight: "700",
    fontFamily: sans,
    marginBottom: 8,
  },
  rowTitle: {
    fontSize: 44,
    lineHeight: 44,
    fontWeight: "300",
    letterSpacing: -1.6,
    color: c.ink,
    fontFamily: sans,
  },
  rowMeta: {
    marginTop: 12,
    fontSize: 12,
    color: c.muted,
    lineHeight: 18,
    maxWidth: 200,
    fontFamily: sans,
  },
  rowRight: {
    alignItems: "flex-end",
    paddingLeft: 16,
  },
  count: {
    fontSize: 52,
    lineHeight: 52,
    fontWeight: "500",
    letterSpacing: -2.5,
    color: c.ink,
    fontFamily: mono,
  },
  countLabel: {
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 2,
    color: c.subtle,
    fontWeight: "700",
    fontFamily: sans,
  },
  arrow: {
    marginTop: 16,
    fontSize: 12,
    color: c.ink,
    fontWeight: "600",
    fontFamily: sans,
  },
  arrowSep: {
    color: c.muted,
  },
  footer: {
    marginTop: 40,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: c.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: c.subtle,
    fontFamily: mono,
    fontWeight: "600",
  },
  kbd: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: c.tagBg,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 3,
  },
  kbdText: {
    fontSize: 9,
    color: c.muted,
    fontWeight: "600",
    fontFamily: mono,
  },
});
