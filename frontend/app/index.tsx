import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, API_URL } from "../src/theme";

const ONBOARDING_KEY = "pmub_onboarded_v1";

type Counts = { programmes: number; resultats: number; total: number };

const HERO_PROGRAMMES =
  "https://images.pexels.com/photos/6818590/pexels-photo-6818590.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const HERO_RESULTATS =
  "https://images.pexels.com/photos/34665172/pexels-photo-34665172.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(true);

  // Check if user has seen onboarding
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!seen) {
          router.replace("/onboarding");
          return;
        }
      } catch {}
      setRedirecting(false);
    })();
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const [allRes, resOnly] = await Promise.all([
          fetch(`${API_URL}/api/races?limit=100`).then((r) => r.json()),
          fetch(`${API_URL}/api/races?doc_type=result&limit=100`).then((r) => r.json()),
        ]);
        setCounts({
          programmes: (allRes.races || []).length,
          resultats: (resOnly.races || []).length,
          total: (allRes.races || []).length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {redirecting ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <Text style={styles.mastheadOverline}>Le Journal Hippique</Text>
          <Text style={styles.mastheadTitle}>PMU&apos;B</Text>
          <View style={styles.mastheadRule} />
          <Text style={styles.tagline}>
            Analyses, pronostics et résultats officiels
          </Text>
        </View>

        {/* Two CTAs */}
        <View style={styles.cards}>
          <TouchableOpacity
            testID="landing-programmes"
            activeOpacity={0.9}
            style={styles.card}
            onPress={() => router.push("/(tabs)/programmes")}
          >
            <Image source={{ uri: HERO_PROGRAMMES }} style={styles.cardImg} />
            <View style={styles.cardOverlay} />
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <View style={styles.cardIconBubble}>
                  <Ionicons name="newspaper" size={18} color="#fff" />
                </View>
                <View style={styles.cardStat}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.cardStatNum}>{counts?.programmes ?? 0}</Text>
                  )}
                  <Text style={styles.cardStatLabel}>à venir</Text>
                </View>
              </View>
              <View>
                <Text style={styles.cardKicker}>Le Journal du jour</Text>
                <Text style={styles.cardTitle}>Programmes</Text>
                <Text style={styles.cardSub}>
                  Course du jour, partants, pronostics des 7 médias, consensus.
                </Text>
                <View style={styles.ctaRow}>
                  <Text style={styles.ctaText}>Entrer</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="landing-resultats"
            activeOpacity={0.9}
            style={styles.card}
            onPress={() => router.push("/resultats")}
          >
            <Image source={{ uri: HERO_RESULTATS }} style={styles.cardImg} />
            <View style={[styles.cardOverlay, styles.cardOverlayGold]} />
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <View style={[styles.cardIconBubble, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                  <Ionicons name="trophy" size={18} color="#fff" />
                </View>
                <View style={styles.cardStat}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.cardStatNum}>{counts?.resultats ?? 0}</Text>
                  )}
                  <Text style={styles.cardStatLabel}>dispo.</Text>
                </View>
              </View>
              <View>
                <Text style={styles.cardKicker}>Après la course</Text>
                <Text style={styles.cardTitle}>Résultats</Text>
                <Text style={styles.cardSub}>
                  Ordre d&apos;arrivée officiel, rapports Ordre / Désordre /
                  Couplé en F CFA.
                </Text>
                <View style={styles.ctaRow}>
                  <Text style={styles.ctaText}>Consulter</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Secondary actions */}
        <View style={styles.secondary}>
          <TouchableOpacity
            testID="landing-search"
            style={styles.secBtn}
            onPress={() => router.push("/search")}
          >
            <Ionicons name="search" size={18} color={theme.colors.brand} />
            <Text style={styles.secBtnText}>Rechercher un cheval, jockey...</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="landing-admin"
            style={styles.secBtn}
            onPress={() => router.push("/admin")}
          >
            <Ionicons name="lock-closed-outline" size={18} color={theme.colors.gold} />
            <Text style={styles.secBtnText}>Espace admin</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Le Journal Hippique · PMU&apos;B · Burkina Faso
        </Text>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const landingStyles = StyleSheet.create({ _: {} });

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingBottom: 24 },
  masthead: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 24,
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
    fontSize: 52,
    color: theme.colors.brand,
    letterSpacing: -1.8,
    marginTop: 2,
  },
  mastheadRule: {
    height: 1,
    backgroundColor: theme.colors.border,
    width: "55%",
    marginVertical: 10,
  },
  tagline: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  cards: { paddingHorizontal: 16, gap: 14, marginTop: 8 },
  card: {
    height: 220,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.brand,
  },
  cardImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,46,26,0.68)",
  },
  cardOverlayGold: { backgroundColor: "rgba(30,20,10,0.72)" },
  cardContent: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardStat: { alignItems: "flex-end" },
  cardStatNum: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 32,
  },
  cardStatLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginTop: 2,
  },
  cardKicker: {
    color: theme.colors.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardTitle: {
    color: "#fff",
    fontFamily: theme.fonts.serifBlack,
    fontSize: 38,
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  cardSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
    maxWidth: 300,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  ctaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  secondary: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  secBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  secBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  footer: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 24,
    letterSpacing: 1,
  },
});
