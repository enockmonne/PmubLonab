import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, API_URL, ADMIN_WEB_URL, formatFCFA } from "../src/theme";

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

export default function ResultatsScreen() {
  const [races, setRaces] = useState<ResultRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/races?has_results=true&limit=100`);
      const j = await r.json();
      setRaces(j.races || []);
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

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.brand} />
      ) : (
        <FlatList
          testID="resultats-list"
          data={races}
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
            <TouchableOpacity
              testID={`result-card-${item.race_id}`}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/race/[race_id]",
                  params: { race_id: item.race_id, from: "resultats" },
                })
              }
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

              {/* Podium */}
              <View style={styles.podiumRow}>
                {item.finishing_order.slice(0, 5).map((n, idx) => (
                  <View
                    key={`${item.race_id}-${idx}`}
                    style={[styles.podiumItem, idx === 0 && styles.podiumGold]}
                  >
                    <Text style={[styles.podiumPos, idx === 0 && { color: "rgba(255,255,255,0.7)" }]}>
                      {idx + 1}
                    </Text>
                    <Text style={[styles.podiumNum, idx === 0 && { color: "#fff" }]}>
                      {n}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Payout */}
              {item.top_payout && (
                <View style={styles.payoutRow}>
                  <Text style={styles.payoutLabel}>{item.top_payout.type}</Text>
                  <Text style={styles.payoutAmt}>
                    {formatFCFA(item.top_payout.amount_fcfa)}
                  </Text>
                </View>
              )}

              <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>Voir tous les rapports</Text>
                <Ionicons name="arrow-forward" size={14} color={theme.colors.brand} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
    fontSize: 11,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  raceName: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  location: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  podiumRow: { flexDirection: "row", gap: 6, marginTop: 14 },
  podiumItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  podiumGold: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  podiumPos: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1,
  },
  podiumNum: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 3,
  },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  payoutLabel: {
    fontSize: 11,
    color: theme.colors.gold,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  payoutAmt: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.brand,
    letterSpacing: -0.3,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.brand,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
