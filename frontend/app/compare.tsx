import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme, API_URL, formatFCFA } from "../src/theme";

type Horse = {
  number: number;
  name: string;
  jockey: string;
  trainer: string;
  owner?: string;
  weight: string;
  age: number;
  sex: string;
  perf: string;
  gains_fcfa: number;
  consensus_score: number;
  consensus_appearances: number;
  commentary?: string;
};

export default function CompareScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const router = useRouter();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const numbers = (ids || "")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
      try {
        const fetched = await Promise.all(
          numbers.map((n) =>
            fetch(`${API_URL}/api/horses/${n}`).then((r) => (r.ok ? r.json() : null))
          )
        );
        const unwrapped = fetched
          .filter(Boolean)
          .map((it: any) => (it.horse ? it.horse : it));
        setHorses(unwrapped as Horse[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [ids]);

  if (loading) {
    return (
      <View style={styles.loader} testID="compare-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const bestScore = Math.max(...horses.map((h) => h.consensus_score || 0), 0);
  const bestGains = Math.max(...horses.map((h) => h.gains_fcfa || 0), 0);

  const metrics: {
    key: keyof Horse | "headline";
    label: string;
    format?: (h: Horse) => string;
    highlight?: (h: Horse) => boolean;
  }[] = [
    { key: "number", label: "Numéro", format: (h) => String(h.number) },
    { key: "weight", label: "Poids", format: (h) => h.weight || "—" },
    {
      key: "age",
      label: "Âge / Sexe",
      format: (h) => `${h.age}a ${h.sex}`,
    },
    { key: "jockey", label: "Jockey", format: (h) => h.jockey },
    { key: "trainer", label: "Entraîneur", format: (h) => h.trainer },
    { key: "perf", label: "Dernières perf.", format: (h) => h.perf || "—" },
    {
      key: "gains_fcfa",
      label: "Gains",
      format: (h) => formatFCFA(h.gains_fcfa || 0),
      highlight: (h) =>
        bestGains > 0 && (h.gains_fcfa || 0) === bestGains,
    },
    {
      key: "consensus_score",
      label: "Score consensus",
      format: (h) => `${h.consensus_score || 0} pts`,
      highlight: (h) =>
        bestScore > 0 && (h.consensus_score || 0) === bestScore,
    },
    {
      key: "consensus_appearances",
      label: "Médias",
      format: (h) => `${h.consensus_appearances || 0}/7`,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
          testID="compare-back"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.overline}>Comparateur</Text>
        <Text style={styles.title}>Côte à côte</Text>
        <Text style={styles.lead}>
          {horses.length} chevaux comparés. Les valeurs en doré indiquent le
          meilleur de chaque ligne.
        </Text>
      </View>

      {horses.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="git-compare-outline"
            size={36}
            color={theme.colors.gold}
          />
          <Text style={styles.emptyTitle}>Aucun cheval sélectionné</Text>
          <Text style={styles.emptyText}>
            Revenez à l&apos;onglet Partants pour activer la sélection multiple.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Top cards with names */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {horses.map((h, i) => (
              <Animated.View
                key={h.number}
                entering={FadeInDown.duration(300).delay(i * 70)}
                style={styles.horseCard}
              >
                <View style={styles.horseNum}>
                  <Text style={styles.horseNumText}>{h.number}</Text>
                </View>
                <Text style={styles.horseName} numberOfLines={2}>
                  {h.name}
                </Text>
                <Text style={styles.horseSub} numberOfLines={1}>
                  {h.jockey}
                </Text>
              </Animated.View>
            ))}
          </ScrollView>

          {/* Metrics matrix */}
          <View style={styles.matrix}>
            {metrics.map((m, i) => (
              <Animated.View
                key={m.label}
                entering={FadeInDown.duration(300).delay(200 + i * 40)}
                style={styles.metricRow}
              >
                <Text style={styles.metricLabel}>{m.label}</Text>
                <View style={styles.metricCells}>
                  {horses.map((h) => {
                    const val = m.format ? m.format(h) : "—";
                    const isBest = m.highlight ? m.highlight(h) : false;
                    return (
                      <View
                        key={`${m.label}-${h.number}`}
                        style={[
                          styles.metricCell,
                          isBest && styles.metricCellBest,
                        ]}
                      >
                        <Text
                          style={[
                            styles.metricValue,
                            isBest && styles.metricValueBest,
                          ]}
                          numberOfLines={2}
                        >
                          {val}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Commentary section */}
          <View style={styles.commentSection}>
            <Text style={styles.sectionLabel}>Commentaires</Text>
            {horses.map((h, i) => (
              <Animated.View
                key={`c-${h.number}`}
                entering={FadeInDown.duration(300).delay(400 + i * 50)}
                style={styles.commentCard}
              >
                <View style={styles.commentHeader}>
                  <View style={styles.commentNum}>
                    <Text style={styles.commentNumText}>{h.number}</Text>
                  </View>
                  <Text style={styles.commentName}>{h.name}</Text>
                </View>
                <Text style={styles.commentText}>
                  {h.commentary || "Aucun commentaire disponible."}
                </Text>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
  headerBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.brand,
    marginLeft: 4,
  },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
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
  lead: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    lineHeight: 17,
  },
  cardsRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 8,
  },
  horseCard: {
    width: 160,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    gap: 6,
  },
  horseNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  horseNumText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  horseName: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  horseSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  matrix: {
    marginTop: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  metricRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metricLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  metricCells: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  metricCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    alignItems: "center",
  },
  metricCellBest: {
    backgroundColor: "rgba(198, 162, 98, 0.12)",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  metricValueBest: {
    color: theme.colors.gold,
  },
  commentSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  commentCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  commentNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  commentNumText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  commentName: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    flex: 1,
  },
  commentText: {
    fontSize: 12.5,
    color: theme.colors.textPrimary,
    lineHeight: 19,
  },
  empty: { alignItems: "center", padding: 40, marginTop: 30 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
});
