import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { theme, API_URL } from "../src/theme";

type RaceSummary = {
  race_id: string;
  name: string;
  date_text: string;
  location: string;
  runners: number;
  is_current: boolean;
};

export default function AdminScreen() {
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const router = useRouter();

  const loadRaces = useCallback(async () => {
    setRacesLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/races?limit=100`);
      const j = await r.json();
      setRaces(j.races || []);
    } catch (e) {
      console.error(e);
    } finally {
      setRacesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadRaces();
  }, [authed, loadRaces]);

  const tryAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const r = await fetch(`${API_URL}/api/admin/verify`, {
        method: "POST",
        headers: { "X-Admin-Passcode": passcode },
      });
      if (r.ok) {
        setAuthed(true);
      } else {
        setAuthError("Passcode invalide");
      }
    } catch {
      setAuthError("Erreur réseau");
    } finally {
      setAuthLoading(false);
    }
  };

  const pickAndUpload = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];

      setUploading(true);
      setUploadMsg(null);

      const form = new FormData();
      // Web vs native handling
      if (asset.file) {
        form.append("file", asset.file as any);
      } else {
        form.append("file", {
          uri: asset.uri,
          name: asset.name || "race.pdf",
          type: "application/pdf",
        } as any);
      }

      const r = await fetch(`${API_URL}/api/admin/races/upload`, {
        method: "POST",
        headers: { "X-Admin-Passcode": passcode },
        body: form,
      });
      const j = await r.json();
      if (!r.ok) {
        setUploadMsg(`❌ ${j.detail || "Erreur"}`);
      } else {
        setUploadMsg(
          `✅ Importé : ${j.summary.name} (${j.summary.horses_parsed} chevaux)`
        );
        loadRaces();
      }
    } catch (e: any) {
      setUploadMsg(`❌ ${e?.message || "Erreur"}`);
    } finally {
      setUploading(false);
    }
  };

  const setCurrent = async (race_id: string) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/races/${race_id}/set-current`, {
        method: "POST",
        headers: { "X-Admin-Passcode": passcode },
      });
      if (!r.ok) throw new Error("Erreur");
      loadRaces();
    } catch {
      Alert.alert("Erreur", "Impossible de définir comme course du jour.");
    }
  };

  const deleteRace = async (race_id: string) => {
    const doDelete = async () => {
      try {
        const r = await fetch(`${API_URL}/api/admin/races/${race_id}`, {
          method: "DELETE",
          headers: { "X-Admin-Passcode": passcode },
        });
        if (!r.ok) throw new Error();
        loadRaces();
      } catch {
        Alert.alert("Erreur", "Suppression impossible.");
      }
    };
    // Alert.alert confirm doesn't work reliably on web — do inline confirm
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm("Supprimer cette course ?")) await doDelete();
    } else {
      Alert.alert("Supprimer", "Confirmer la suppression ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  if (!authed) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            testID="admin-back"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.authBox}>
          <Ionicons name="lock-closed" size={36} color={theme.colors.brand} />
          <Text style={styles.authTitle}>Espace admin</Text>
          <Text style={styles.authSub}>
            Saisissez le passcode pour accéder à l&apos;import des PDF.
          </Text>
          <TextInput
            testID="admin-passcode"
            style={styles.authInput}
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Passcode"
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={tryAuth}
          />
          {authError && <Text style={styles.authError}>{authError}</Text>}
          <TouchableOpacity
            testID="admin-login"
            style={[styles.authBtn, authLoading && { opacity: 0.6 }]}
            onPress={tryAuth}
            disabled={authLoading || !passcode}
          >
            <Text style={styles.authBtnText}>
              {authLoading ? "Vérification..." : "Se connecter"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="admin-logout"
          onPress={() => {
            setAuthed(false);
            setPasscode("");
          }}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView testID="admin-screen" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.sectionHead}>
          <Text style={styles.overline}>Admin</Text>
          <Text style={styles.title}>Gestion des courses</Text>
        </View>

        {/* Upload */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Importer un PDF</Text>
          <Text style={styles.cardSub}>
            Le fichier sera parsé automatiquement par l&apos;IA. Le coût
            approximatif est de 0,02–0,05 $ par PDF.
          </Text>
          <TouchableOpacity
            testID="admin-upload"
            style={[styles.primaryBtn, uploading && { opacity: 0.6 }]}
            onPress={pickAndUpload}
            disabled={uploading}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>
              {uploading ? "Parsing en cours..." : "Choisir un fichier PDF"}
            </Text>
          </TouchableOpacity>
          {uploadMsg && (
            <Text
              style={[
                styles.uploadMsg,
                uploadMsg.startsWith("✅") ? styles.uploadMsgOk : styles.uploadMsgErr,
              ]}
              testID="upload-msg"
            >
              {uploadMsg}
            </Text>
          )}
        </View>

        {/* Races list */}
        <View style={styles.sectionHead}>
          <Text style={styles.subSectionTitle}>Courses existantes</Text>
        </View>
        {racesLoading ? (
          <ActivityIndicator color={theme.colors.brand} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.racesList}>
            {races.map((r) => (
              <View key={r.race_id} style={styles.raceItem} testID={`admin-race-${r.race_id}`}>
                <View style={{ flex: 1 }}>
                  <View style={styles.raceTitleRow}>
                    <Text style={styles.raceTitle} numberOfLines={1}>
                      {r.name}
                    </Text>
                    {r.is_current && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Jour</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.raceMeta}>
                    {r.date_text} • {r.location} • {r.runners} partants
                  </Text>
                </View>
                <View style={styles.actions}>
                  {!r.is_current && (
                    <TouchableOpacity
                      testID={`admin-set-current-${r.race_id}`}
                      style={styles.actionBtn}
                      onPress={() => setCurrent(r.race_id)}
                    >
                      <Ionicons name="star-outline" size={16} color={theme.colors.brand} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    testID={`admin-delete-${r.race_id}`}
                    style={styles.actionBtn}
                    onPress={() => deleteRace(r.race_id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: { fontSize: 14, fontWeight: "600", color: theme.colors.brand, marginLeft: 2 },
  logoutBtn: { padding: 4 },

  authBox: { alignItems: "center", padding: 24, marginTop: 30 },
  authTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  authSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  authInput: {
    width: "100%",
    marginTop: 20,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  authError: { color: theme.colors.accent, fontSize: 13, marginTop: 10 },
  authBtn: {
    marginTop: 14,
    width: "100%",
    backgroundColor: theme.colors.brand,
    paddingVertical: 14,
    alignItems: "center",
  },
  authBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  sectionHead: { paddingHorizontal: 16, paddingTop: 16 },
  overline: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
  cardSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 17 },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: theme.colors.brand,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  uploadMsg: { marginTop: 10, fontSize: 13, fontWeight: "600" },
  uploadMsgOk: { color: theme.colors.brand },
  uploadMsgErr: { color: theme.colors.accent },

  racesList: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  raceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  raceTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  raceTitle: { fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  currentBadge: {
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  raceMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
