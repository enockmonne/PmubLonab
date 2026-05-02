import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme, API_URL, formatFCFA } from "../../src/theme";
import { haptics } from "../../src/haptics";
import HorseLoader from "../../src/HorseLoader";

type Horse = {
  number: number;
  name: string;
  jockey: string;
  trainer: string;
  weight: string;
  age: number;
  sex: string;
  perf: string;
  gains_fcfa: number;
  consensus_score: number;
  consensus_appearances: number;
};

type SortKey = "number" | "consensus" | "gains";

export default function PartantsScreen() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/horses`);
      const j = await r.json();
      setHorses(j.horses || []);
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

  const filtered = horses
    .filter(
      (h) =>
        h.name.toLowerCase().includes(query.toLowerCase()) ||
        h.jockey.toLowerCase().includes(query.toLowerCase()) ||
        h.trainer.toLowerCase().includes(query.toLowerCase()) ||
        String(h.number) === query
    )
    .sort((a, b) => {
      if (sortKey === "consensus") return b.consensus_score - a.consensus_score;
      if (sortKey === "gains") return b.gains_fcfa - a.gains_fcfa;
      return a.number - b.number;
    });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.overline}>16 Partants</Text>
        <Text style={styles.title}>Les Concurrents</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
        <TextInput
          testID="search-horses"
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un cheval, jockey, entraîneur..."
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <View style={styles.sortRow}>
        {(
          [
            { k: "number", label: "N°" },
            { k: "consensus", label: "Consensus" },
            { k: "gains", label: "Gains" },
          ] as { k: SortKey; label: string }[]
        ).map((opt) => (
          <TouchableOpacity
            key={opt.k}
            testID={`sort-${opt.k}`}
            onPress={() => setSortKey(opt.k)}
            style={[styles.sortPill, sortKey === opt.k && styles.sortPillActive]}
          >
            <Text
              style={[
                styles.sortPillText,
                sortKey === opt.k && styles.sortPillTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          testID="toggle-compare"
          onPress={() => {
            haptics.medium();
            setCompareMode((v) => !v);
            setSelected([]);
          }}
          style={[styles.compareBtn, compareMode && styles.compareBtnActive]}
        >
          <Ionicons
            name={compareMode ? "close" : "git-compare-outline"}
            size={14}
            color={compareMode ? "#fff" : theme.colors.brand}
          />
          <Text
            style={[
              styles.compareBtnText,
              compareMode && styles.compareBtnTextActive,
            ]}
          >
            {compareMode ? "Quitter" : "Comparer"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          color={theme.colors.brand}
          testID="partants-loading"
        />
      ) : (
        <FlatList
          testID="horses-list"
          data={filtered}
          keyExtractor={(h) => String(h.number)}
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
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.number);
            return (
              <TouchableOpacity
                testID={`horse-row-${item.number}`}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => {
                  if (compareMode) {
                    haptics.selection();
                    setSelected((cur) =>
                      cur.includes(item.number)
                        ? cur.filter((n) => n !== item.number)
                        : cur.length < 4
                        ? [...cur, item.number]
                        : cur
                    );
                  } else {
                    router.push(`/horse/${item.number}`);
                  }
                }}
              >
                <View style={styles.numBox}>
                  <Text style={styles.numText}>{item.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.horseName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.subMeta} numberOfLines={1}>
                    {item.jockey} • {item.trainer}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>{item.weight}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>
                        {item.age}a {item.sex}
                      </Text>
                    </View>
                    <View style={styles.perfChip}>
                      <Text style={styles.perfChipText}>{item.perf}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreVal}>{item.consensus_score}</Text>
                  <Text style={styles.scoreLabel}>pts</Text>
                </View>
                {compareMode ? (
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Floating action bar in compare mode */}
      {compareMode && selected.length > 0 && (
        <View style={styles.compareBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.compareBarText}>
              {selected.length} sélectionné{selected.length > 1 ? "s" : ""} •{" "}
              #{selected.join(" · #")}
            </Text>
            <Text style={styles.compareBarHint}>
              Sélectionnez 2 à 4 chevaux pour comparer
            </Text>
          </View>
          <TouchableOpacity
            testID="compare-go"
            disabled={selected.length < 2}
            style={[
              styles.compareGo,
              selected.length < 2 && { opacity: 0.4 },
            ]}
            onPress={() => {
              haptics.success();
              router.push(`/compare?ids=${selected.join(",")}`);
            }}
          >
            <Text style={styles.compareGoText}>Comparer</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
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
    color: theme.colors.textPrimary,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginTop: 6,
  },
  search: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginLeft: 6,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  sortPillActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brand,
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  sortPillTextActive: { color: "#fff" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    gap: 12,
  },
  sep: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: 16 },
  numBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  horseName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  subMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  metaChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  metaChipText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  perfChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: theme.colors.brand,
  },
  perfChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
    fontFamily: "Courier",
  },
  scoreCol: { alignItems: "center", minWidth: 36 },
  scoreVal: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.gold,
  },
  scoreLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  // ---- Compare mode ----
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.surface,
  },
  compareBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  compareBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.brand,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  compareBtnTextActive: {
    color: "#fff",
  },
  rowSelected: {
    backgroundColor: "rgba(10, 46, 26, 0.06)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  compareBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.brand,
    borderWidth: 1,
    borderColor: theme.colors.brand,
  },
  compareBarText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },
  compareBarHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  compareGo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.gold,
  },
  compareGoText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

// suppress unused import warning
void formatFCFA;
