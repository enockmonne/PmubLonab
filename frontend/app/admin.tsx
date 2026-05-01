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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { theme, API_URL } from "../src/theme";

const TOKEN_KEY = "pmub_admin_token";
const EMAIL_KEY = "pmub_admin_email";

type RaceSummary = {
  race_id: string;
  name: string;
  date_text: string;
  location: string;
  runners: number;
  is_current: boolean;
  doc_type?: string;
};

type Status = {
  stats: { total_races: number; programmes: number; results: number };
  current_race: { race_id: string; name: string; date_text: string; location: string } | null;
  last_upload: { race_id: string; name: string; date_text: string; created_at: string; doc_type: string } | null;
  llm: { status: string; error: string | null };
  admin: { email: string; role: string; last_login_at?: string | null; created_at?: string };
};

export default function AdminScreen() {
  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bootChecking, setBootChecking] = useState(true);

  // Data
  const [status, setStatus] = useState<Status | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const router = useRouter();

  const authHeaders = useCallback(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  // Boot: try to load token from storage and verify
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (saved) {
          // verify it
          const r = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${saved}` },
          });
          if (r.ok) {
            setToken(saved);
            const savedEmail = await AsyncStorage.getItem(EMAIL_KEY);
            if (savedEmail) setEmail(savedEmail);
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch (e) {
        console.warn("Token check failed", e);
      } finally {
        setBootChecking(false);
      }
    })();
  }, []);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    setStatusLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/admin/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        if (r.status === 401) {
          await logout();
          return;
        }
        throw new Error("status fail");
      }
      const j = await r.json();
      setStatus(j);
    } catch (e) {
      console.error(e);
    } finally {
      setStatusLoading(false);
    }
  }, [token]);

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
    if (token) {
      loadStatus();
      loadRaces();
    }
  }, [token, loadStatus, loadRaces]);

  const tryLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const r = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const j = await r.json();
      if (!r.ok) {
        setAuthError(j.detail || "Identifiants invalides");
        return;
      }
      await AsyncStorage.setItem(TOKEN_KEY, j.token);
      await AsyncStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
      setToken(j.token);
      setPassword("");
    } catch {
      setAuthError("Erreur réseau");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setStatus(null);
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
        headers: { ...authHeaders() },
        body: form,
      });
      const j = await r.json();
      if (!r.ok) {
        setUploadMsg(`❌ ${j.detail || "Erreur"}`);
      } else {
        setUploadMsg(`✅ Importé : ${j.summary.name} (${j.summary.horses_parsed} chevaux)`);
        loadStatus();
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
        headers: { ...authHeaders() },
      });
      if (!r.ok) throw new Error();
      loadStatus();
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
          headers: { ...authHeaders() },
        });
        if (!r.ok) throw new Error();
        loadStatus();
        loadRaces();
      } catch {
        Alert.alert("Erreur", "Suppression impossible.");
      }
    };
    if (typeof window !== "undefined" && (window as any).confirm) {
      if ((window as any).confirm("Supprimer cette course ?")) await doDelete();
    } else {
      Alert.alert("Supprimer", "Confirmer la suppression ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (bootChecking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
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
          <ScrollView contentContainerStyle={{ paddingTop: 30, paddingHorizontal: 24 }}>
            <View style={styles.authIconWrap}>
              <Ionicons name="lock-closed" size={28} color={theme.colors.brand} />
            </View>
            <Text style={styles.authOverline}>Espace privé</Text>
            <Text style={styles.authTitle}>Connexion Admin</Text>
            <Text style={styles.authSub}>
              Entrez vos identifiants pour gérer les courses, uploads et configuration.
            </Text>

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              testID="admin-email"
              style={styles.fieldInput}
              value={email}
              onChangeText={setEmail}
              placeholder="email@pmub.app"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Mot de passe</Text>
            <TextInput
              testID="admin-password"
              style={styles.fieldInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={tryLogin}
            />

            {authError && (
              <View style={styles.authErrorBox}>
                <Ionicons name="alert-circle" size={14} color={theme.colors.accent} />
                <Text style={styles.authError}>{authError}</Text>
              </View>
            )}

            <TouchableOpacity
              testID="admin-login"
              style={[styles.authBtn, authLoading && { opacity: 0.6 }]}
              onPress={tryLogin}
              disabled={authLoading || !email || !password}
            >
              <Text style={styles.authBtnText}>
                {authLoading ? "Connexion..." : "Se connecter"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.authFooter}>
              Session sécurisée par JWT (validité 7 jours)
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Authed view
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="admin-logout" onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView testID="admin-screen" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.sectionHead}>
          <Text style={styles.overline}>Tableau de bord</Text>
          <Text style={styles.title}>Admin</Text>
          {status?.admin?.email && (
            <Text style={styles.welcome}>Connecté en tant que {status.admin.email}</Text>
          )}
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <Animated.View
            entering={FadeInDown.duration(300).delay(0)}
            style={styles.statCard}
          >
            <Text style={styles.statLabel}>Courses</Text>
            <Text style={styles.statValue}>
              {statusLoading ? "…" : status?.stats.total_races ?? 0}
            </Text>
            <Text style={styles.statSub}>
              {status?.stats.programmes ?? 0} prog. • {status?.stats.results ?? 0} rés.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(300).delay(60)}
            style={styles.statCard}
          >
            <Text style={styles.statLabel}>Course du jour</Text>
            <Text style={styles.statValueSm} numberOfLines={2}>
              {status?.current_race?.name || "Aucune"}
            </Text>
            <Text style={styles.statSub}>
              {status?.current_race?.date_text || ""}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(300).delay(120)}
            style={styles.statCard}
          >
            <Text style={styles.statLabel}>Dernier upload</Text>
            <Text style={styles.statValueSm} numberOfLines={2}>
              {status?.last_upload?.name || "—"}
            </Text>
            <Text style={styles.statSub}>
              {formatDate(status?.last_upload?.created_at)}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(300).delay(180)}
            style={[
              styles.statCard,
              status?.llm?.status === "ok" && styles.statCardOk,
              status?.llm?.status === "error" && styles.statCardErr,
            ]}
          >
            <Text style={styles.statLabel}>Clé LLM</Text>
            <View style={styles.llmRow}>
              <Ionicons
                name={
                  status?.llm?.status === "ok"
                    ? "checkmark-circle"
                    : status?.llm?.status === "error"
                    ? "close-circle"
                    : "ellipse"
                }
                size={18}
                color={
                  status?.llm?.status === "ok"
                    ? "#16A34A"
                    : status?.llm?.status === "error"
                    ? theme.colors.accent
                    : theme.colors.textSecondary
                }
              />
              <Text style={styles.statValueSm}>
                {status?.llm?.status === "ok"
                  ? "Active"
                  : status?.llm?.status === "error"
                  ? "Erreur"
                  : "…"}
              </Text>
            </View>
            <Text style={styles.statSub} numberOfLines={2}>
              {status?.llm?.error || "Test en direct"}
            </Text>
          </Animated.View>
        </View>

        {/* Upload */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(240)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Importer un PDF</Text>
          <Text style={styles.cardSub}>
            Le fichier sera parsé automatiquement par l&apos;IA. Programmes et
            résultats sont reconnus automatiquement.
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
        </Animated.View>

        {/* Races list */}
        <View style={styles.sectionHead}>
          <Text style={styles.subSectionTitle}>Courses existantes</Text>
        </View>
        {racesLoading ? (
          <ActivityIndicator color={theme.colors.brand} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.racesList}>
            {races.map((r, i) => (
              <Animated.View
                key={r.race_id}
                entering={FadeInDown.duration(250).delay(i * 30)}
                style={styles.raceItem}
                testID={`admin-race-${r.race_id}`}
              >
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
                    {r.doc_type === "result" && (
                      <View style={styles.resultBadge}>
                        <Text style={styles.resultBadgeText}>Résultat</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.raceMeta}>
                    {r.date_text} • {r.location} • {r.runners} partants
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    testID={`admin-view-${r.race_id}`}
                    style={styles.actionBtn}
                    onPress={() => router.push(`/race/${r.race_id}`)}
                  >
                    <Ionicons name="eye-outline" size={16} color={theme.colors.brand} />
                  </TouchableOpacity>
                  {!r.is_current && (
                    <TouchableOpacity
                      testID={`admin-set-current-${r.race_id}`}
                      style={styles.actionBtn}
                      onPress={() => setCurrent(r.race_id)}
                    >
                      <Ionicons name="star-outline" size={16} color={theme.colors.gold} />
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
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
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

  authIconWrap: {
    alignSelf: "flex-start",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  authOverline: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  authTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.4,
  },
  authSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 14,
  },
  fieldInput: {
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  authErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    padding: 10,
    backgroundColor: "rgba(208, 84, 65, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  authError: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: "600",
  },
  authBtn: {
    marginTop: 22,
    height: 50,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  authBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  authFooter: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },

  // Dashboard
  sectionHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
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
  welcome: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  subSectionTitle: {
    fontSize: 13,
    color: theme.colors.gold,
    letterSpacing: 2,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 96,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  statCardOk: {
    borderLeftWidth: 3,
    borderLeftColor: "#16A34A",
  },
  statCardErr: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.colors.gold,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -1,
  },
  statValueSm: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  statSub: {
    fontSize: 10.5,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 14,
  },
  llmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  card: {
    margin: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  primaryBtn: {
    marginTop: 14,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.brand,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  uploadMsg: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  uploadMsgOk: { color: "#16A34A" },
  uploadMsgErr: { color: theme.colors.accent },

  racesList: { paddingHorizontal: 16, marginTop: 8 },
  raceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: -1,
    gap: 8,
  },
  raceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  raceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  raceMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: theme.colors.gold,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  resultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  resultBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  actions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
});
