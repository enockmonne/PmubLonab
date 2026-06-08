import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL, formatFCFA, theme } from "../../src/theme";

type HorseDetailData = {
  horse: {
    number: number;
    name: string;
    jockey: string;
    trainer: string;
    owner: string;
    weight?: string;
    age?: number;
    sex?: string;
    distance?: string;
    chrono?: string;
    perf?: string;
    gains_fcfa?: number;
    commentary?: string;
    odds?: { source: string; odds: string }[];
  };
  expert_mentions: { source: string; rank: number }[];
  classifications: string[];
};

export default function HorseDetail() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const router = useRouter();
  const [data, setData] = useState<HorseDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/horses/${number}`);
      if (response.ok) {
        setData(await response.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [number]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <View style={styles.loader} testID="horse-detail-loading">
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const { horse, expert_mentions, classifications } = data;
  const odds = horse.odds || [];
  const parisTurfOdds = odds.find((entry) => entry.source === "Paris Turf")?.odds || "-";
  const tierceMagazineOdds =
    odds.find((entry) => entry.source === "Tierce Magazine")?.odds || "-";
  const sexeAge = `${horse.sex || "-"}${horse.age ? `.${horse.age}` : ""}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="horse-back-btn"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
          <Text style={styles.backText}>Partants</Text>
        </TouchableOpacity>
      </View>

      <ScrollView testID="horse-detail-screen" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          <View style={styles.heroNum}>
            <Text style={styles.heroNumText}>{horse.number}</Text>
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroOverline}>Fiche cheval</Text>
            <Text style={styles.heroName}>{horse.name}</Text>
            <Text style={styles.heroMeta}>
              Donnees extraites du PDF programme.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Profil PDF</Text>
          <View style={styles.rawGrid}>
            <RawCell label="N" value={`${horse.number}`} />
            <RawCell label="Sexe / age" value={sexeAge} />
            <RawCell label="Distance" value={horse.distance || "-"} />
            <RawCell label="Chrono" value={horse.chrono || "-"} />
            <RawCell label="Perf." value={horse.perf || "-"} mono />
            <RawCell label="Gains" value={horse.gains_fcfa ? formatFCFA(horse.gains_fcfa) : "-"} />
            <RawCell label="Paris Turf" value={parisTurfOdds} />
            <RawCell label="Tierce Magazine" value={tierceMagazineOdds} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Entourage</Text>
          <View style={styles.infoGrid}>
            <InfoCell label="Driver / jockey" value={horse.jockey || "-"} />
            <InfoCell label="Entraineur" value={horse.trainer || "-"} />
            <InfoCell label="Proprietaire" value={horse.owner || "-"} span />
          </View>
        </View>

        {expert_mentions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Pronostics PDF</Text>
            <View style={styles.list}>
              {expert_mentions.map((mention) => (
                <View key={mention.source} style={styles.row}>
                  <Text style={styles.rowTitle}>{mention.source}</Text>
                  <Text style={styles.rowValue}>#{mention.rank}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {classifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Categories PDF</Text>
            <View style={styles.tagsRow}>
              {classifications.map((classification) => (
                <View key={classification} style={styles.tag}>
                  <Text style={styles.tagText}>{classification}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {horse.commentary ? (
          <View style={styles.section}>
            <Text style={styles.label}>Commentaire PDF</Text>
            <Text style={styles.commentary}>{horse.commentary}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function RawCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.rawCell}>
      <Text style={styles.rawLabel}>{label}</Text>
      <Text style={[styles.rawValue, mono && styles.monoValue]} numberOfLines={2}>
        {value || "-"}
      </Text>
    </View>
  );
}

function InfoCell({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <View style={[styles.infoCell, span && { width: "100%" }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "-"}</Text>
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
  headerBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.brand,
    marginLeft: 2,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    margin: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  heroNum: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  heroNumText: { color: "#fff", fontSize: 30, fontWeight: "900" },
  heroTextWrap: { flex: 1, minWidth: 0 },
  heroOverline: {
    fontSize: 10,
    color: theme.colors.gold,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroName: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 17,
  },
  section: { marginTop: 18, paddingHorizontal: 16 },
  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  rawGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rawCell: {
    width: "50%",
    minHeight: 66,
    padding: 11,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  rawLabel: {
    fontSize: 9,
    color: theme.colors.gold,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rawValue: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 5,
  },
  monoValue: {
    fontFamily: "Courier",
    letterSpacing: 0.5,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  infoCell: {
    width: "50%",
    padding: 12,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: "600",
    marginTop: 4,
  },
  list: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowTitle: { flex: 1, fontSize: 13, color: theme.colors.textPrimary },
  rowValue: { fontSize: 13, fontWeight: "800", color: theme.colors.brand },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagText: {
    color: theme.colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  commentary: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.textPrimary,
    fontStyle: "italic",
  },
});
