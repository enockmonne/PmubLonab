import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { theme, API_URL } from "../src/theme";

type HorseHit = {
  kind: "horse";
  number: number;
  name: string;
  jockey: string;
  trainer: string;
};
type PersonHit = {
  kind: "person";
  role: "jockey" | "trainer";
  name: string;
  horses: number[];
};
type RaceHit = {
  kind: "race";
  race_id: string;
  name: string;
  date_text: string;
  date_iso: string;
  location: string;
  doc_type: string;
};
type Hit = HorseHit | PersonHit | RaceHit;

const norm = (s: string) => (s || "").toLowerCase().trim();

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [horses, setHorses] = useState<HorseHit[]>([]);
  const [races, setRaces] = useState<RaceHit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [hRes, rRes] = await Promise.all([
        fetch(`${API_URL}/api/horses`),
        fetch(`${API_URL}/api/races?limit=200`),
      ]);
      const hJson = await hRes.json();
      const rJson = await rRes.json();
      setHorses(
        (hJson.horses || []).map((h: any) => ({
          kind: "horse" as const,
          number: h.number,
          name: h.name,
          jockey: h.jockey,
          trainer: h.trainer,
        }))
      );
      setRaces(
        (rJson.races || []).map((r: any) => ({
          kind: "race" as const,
          race_id: r.race_id,
          name: r.name,
          date_text: r.date_text,
          date_iso: r.date_iso,
          location: r.location,
          doc_type: r.doc_type,
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { hits, counts } = useMemo(() => {
    const q = norm(query);
    if (!q) return { hits: [] as Hit[], counts: { horses: 0, persons: 0, races: 0 } };

    // horses
    const horseHits: HorseHit[] = horses.filter((h) => {
      return (
        norm(h.name).includes(q) ||
        String(h.number) === q ||
        norm(h.jockey).includes(q) ||
        norm(h.trainer).includes(q)
      );
    });

    // persons (jockeys + trainers)
    const personsMap = new Map<string, PersonHit>();
    horses.forEach((h) => {
      [
        { role: "trainer" as const, name: h.trainer },
        { role: "jockey" as const, name: h.jockey },
      ].forEach(({ role, name }) => {
        if (!name) return;
        if (!norm(name).includes(q)) return;
        const key = `${role}:${name}`;
        const existing = personsMap.get(key);
        if (existing) {
          existing.horses.push(h.number);
        } else {
          personsMap.set(key, {
            kind: "person",
            role,
            name,
            horses: [h.number],
          });
        }
      });
    });
    const personHits = Array.from(personsMap.values());

    // races
    const raceHits: RaceHit[] = races.filter((r) => {
      return (
        norm(r.name).includes(q) ||
        norm(r.location).includes(q) ||
        norm(r.date_text).includes(q) ||
        norm(r.date_iso).includes(q)
      );
    });

    const all: Hit[] = [...horseHits, ...personHits, ...raceHits];
    return {
      hits: all,
      counts: {
        horses: horseHits.length,
        persons: personHits.length,
        races: raceHits.length,
      },
    };
  }, [horses, races, query]);

  const renderItem = ({ item, index }: { item: Hit; index: number }) => (
    <Animated.View entering={FadeInDown.duration(250).delay(index * 25)}>
      {item.kind === "horse" && (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push(`/horse/${item.number}`)}
        >
          <View style={styles.iconBox}>
            <Text style={styles.numText}>{item.number}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSub}>
              Cheval • {item.jockey} / {item.trainer}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {item.kind === "person" && (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push(`/horse/${item.horses[0]}`)}
        >
          <View style={[styles.iconBox, styles.iconBoxPerson]}>
            <Ionicons
              name={item.role === "trainer" ? "person-outline" : "walk-outline"}
              size={18}
              color={theme.colors.textPrimary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSub}>
              {item.role === "trainer" ? "Entraîneur" : "Jockey"} •{" "}
              {item.horses.length} cheval(aux) : #{item.horses.join(", #")}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {item.kind === "race" && (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push(`/race/${item.race_id}`)}
        >
          <View style={[styles.iconBox, styles.iconBoxRace]}>
            <Ionicons
              name={item.doc_type === "result" ? "trophy" : "newspaper"}
              size={16}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSub}>
              {item.doc_type === "result" ? "Résultat" : "Programme"} •{" "}
              {item.date_text} • {item.location}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.overline}>Recherche</Text>
          <Text style={styles.title}>Tout explorer</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            testID="global-search-input"
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Cheval, jockey, entraîneur, course, date..."
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {query.length > 0 && (
          <View style={styles.countsRow}>
            <Text style={styles.countsText}>
              {counts.horses} cheval(aux) • {counts.persons} personne(s) •{" "}
              {counts.races} course(s)
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 40 }}
            color={theme.colors.brand}
          />
        ) : (
          <FlatList
            data={hits}
            keyExtractor={(it, i) =>
              it.kind === "horse"
                ? `h-${it.number}`
                : it.kind === "person"
                ? `p-${it.role}-${it.name}-${i}`
                : `r-${it.race_id}`
            }
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 32,
            }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              query.length > 0 ? (
                <View style={styles.empty}>
                  <Ionicons
                    name="search-outline"
                    size={36}
                    color={theme.colors.gold}
                  />
                  <Text style={styles.emptyTitle}>Aucun résultat</Text>
                  <Text style={styles.emptyText}>
                    Essayez un autre terme, un numéro, un nom d&apos;hippodrome
                    ou une date (ex. &quot;2026-04&quot;).
                  </Text>
                </View>
              ) : (
                <View style={styles.hints}>
                  <Text style={styles.hintsTitle}>Exemples de recherche</Text>
                  {[
                    "ZULU WARRIOR",
                    "M. Guyon",
                    "A. Fabre",
                    "8",
                    "ParisLongchamp",
                    "Pavillon Royal",
                    "2026-04",
                  ].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setQuery(s)}
                      style={styles.hintChip}
                    >
                      <Text style={styles.hintChipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            }
          />
        )}
      </KeyboardAvoidingView>
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
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.brand,
    marginLeft: 4,
  },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  overline: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 2,
  },
  countsRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  countsText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  sep: { height: 1, backgroundColor: theme.colors.border },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxPerson: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconBoxRace: {
    backgroundColor: theme.colors.gold,
  },
  numText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  rowSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  empty: { alignItems: "center", padding: 40, marginTop: 20 },
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
  hints: {
    padding: 20,
    alignItems: "flex-start",
  },
  hintsTitle: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
    color: theme.colors.gold,
    marginBottom: 10,
  },
  hintChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 6,
  },
  hintChipText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
});
