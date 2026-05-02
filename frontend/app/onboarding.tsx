import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image,
  ImageSourcePropType,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "../src/theme";
import { haptics } from "../src/haptics";

const ONBOARDING_KEY = "pmub_onboarded_v1";

const { width: SCREEN_W } = Dimensions.get("window");

type Slide = {
  overline: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  bg: ImageSourcePropType;
};

const slides: Slide[] = [
  {
    overline: "Le Journal Hippique",
    title: "Pronostics éclairés.",
    body:
      "Chaque cheval est noté par 7 médias spécialisés. Notre algorithme calcule un consensus pour faire ressortir le favori du jour, l'outsider à risque et les chevaux à surveiller.",
    icon: "trophy",
    accent: theme.colors.gold,
    bg: { uri: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80" },
  },
  {
    overline: "Résultats officiels",
    title: "Tous les rapports PMU.",
    body:
      "Arrivées officielles, Ordre, Désordre, Couplé Gagnant, Couplés Placés, Tiercé, Quarté+, Quinté+. Tous les montants en F CFA, instantanément après chaque course.",
    icon: "podium",
    accent: theme.colors.brand,
    bg: { uri: "https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=800&q=80" },
  },
  {
    overline: "Recherche & comparateur",
    title: "Outils de pro.",
    body:
      "Recherchez un cheval, un jockey ou un entraîneur en un instant. Comparez jusqu'à 4 chevaux côte-à-côte pour ne plus jamais hésiter avant l'arrêt des jeux.",
    icon: "git-compare",
    accent: theme.colors.gold,
    bg: { uri: "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=800&q=80" },
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const finish = async () => {
    haptics.success();
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    } catch {}
    router.replace("/");
  };

  const goNext = () => {
    if (index < slides.length - 1) {
      haptics.selection();
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.brandWrap}>
          <Text style={styles.brandText}>PMU&apos;B</Text>
        </Animated.View>
        {index < slides.length - 1 && (
          <TouchableOpacity testID="onboarding-skip" onPress={finish} hitSlop={10}>
            <Text style={styles.skipText}>Passer</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s, i) => `${s.title}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const ix = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setIndex(ix);
        }}
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width: SCREEN_W }]}>
            <View style={styles.imgWrap}>
              <Image source={item.bg} style={styles.bgImg} />
              <View style={styles.bgOverlay} />
              <Animated.View
                entering={FadeInDown.duration(500).delay(i === index ? 100 : 0)}
                style={[styles.iconCircle, { backgroundColor: item.accent }]}
              >
                <Ionicons name={item.icon} size={32} color="#fff" />
              </Animated.View>
            </View>

            <View style={styles.content}>
              <Animated.Text
                entering={FadeInDown.duration(500).delay(150)}
                style={[styles.overline, { color: item.accent }]}
              >
                {item.overline}
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.duration(550).delay(220)}
                style={styles.title}
              >
                {item.title}
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.duration(600).delay(300)}
                style={styles.body}
              >
                {item.body}
              </Animated.Text>
            </View>
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          testID="onboarding-cta"
          onPress={goNext}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>
            {index < slides.length - 1 ? "Suivant" : "Commencer"}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  brandWrap: {},
  brandText: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 20,
    color: theme.colors.brand,
    letterSpacing: -0.5,
  },
  skipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  slide: { flex: 1 },
  imgWrap: {
    height: 380,
    backgroundColor: theme.colors.brand,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 30,
  },
  bgImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.55,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 46, 26, 0.55)",
  },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  content: {
    padding: 24,
    paddingTop: 32,
  },
  overline: {
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    fontFamily: theme.fonts.serifBlack,
    fontSize: 36,
    color: theme.colors.textPrimary,
    letterSpacing: -1,
    marginTop: 10,
    lineHeight: 40,
  },
  body: {
    fontSize: 14.5,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: 16,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dotsRow: { flexDirection: "row", gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: theme.colors.brand,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.colors.brand,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
