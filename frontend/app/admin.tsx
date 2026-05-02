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
import { haptics } from "../src/haptics";
import HorseLoader from "../src/HorseLoader";

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
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    done: number;
    current: string;
  } | null>(null);

  // Announcements (AD3)
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annText, setAnnText] = useState("");
  const [annLevel, setAnnLevel] = useState<"info" | "warning" | "success" | "error">("info");
  const [annLoading, setAnnLoading] = useState(false);

  // Logs (AD4)
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

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

  const loadAnnouncements = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/admin/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      setAnnouncements(j.announcements || []);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  const loadLogs = useCallback(async () => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/admin/logs?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      setLogs(j.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadStatus();
      loadRaces();
      loadAnnouncements();
      loadLogs();
    }
  }, [token, loadStatus, loadRaces, loadAnnouncements, loadLogs]);

  const tryLogin = async () => {
    haptics.light();
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
        haptics.error();
        setAuthError(j.detail || "Identifiants invalides");
        return;
      }
      haptics.success();
      await AsyncStorage.setItem(TOKEN_KEY, j.token);
      await AsyncStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
      setToken(j.token);
      setPassword("");
    } catch {
      haptics.error();
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
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const assets = picked.assets;

      setUploading(true);
      setUploadMsg(null);
      setUploadProgress({ total: assets.length, done: 0, current: assets[0].name || "" });

      const successes: string[] = [];
      const failures: { name: string; reason: string }[] = [];

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        setUploadProgress({ total: assets.length, done: i, current: asset.name || `Fichier ${i + 1}` });
        try {
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
          if (r.ok) {
            successes.push(j.summary?.name || asset.name || "");
          } else {
            failures.push({ name: asset.name || `#${i + 1}`, reason: j.detail || "Erreur" });
          }
        } catch (e: any) {
          failures.push({ name: asset.name || `#${i + 1}`, reason: e?.message || "Erreur" });
        }
      }

      setUploadProgress({ total: assets.length, done: assets.length, current: "" });

      let msg = "";
      if (successes.length) msg += `✅ ${successes.length} importé(s)`;
      if (failures.length) {
        if (msg) msg += " — ";
        msg += `❌ ${failures.length} échec(s) : ${failures.map((f) => f.name).join(", ")}`;
      }
      setUploadMsg(msg || "Aucun fichier traité");
      loadStatus();
      loadRaces();
      loadLogs();
    } catch (e: any) {
      setUploadMsg(`❌ ${e?.message || "Erreur"}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 1500);
    }
  };

  // Announcements
  const createAnnouncement = async () => {
    if (!annText.trim()) return;
    setAnnLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/admin/announcements`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: annText.trim(), level: annLevel, active: true }),
      });
      if (r.ok) {
        setAnnText("");
        loadAnnouncements();
        loadLogs();
      }
    } catch {}
    setAnnLoading(false);
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/admin/announcements/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      loadAnnouncements();
      loadLogs();
    } catch {}
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
        <HorseLoader size={48} label="Vérification…" />
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
            Sélectionnez un ou plusieurs PDFs (programmes ou résultats). Le
            parsing IA est séquentiel, comptez ~30s par fichier.
          </Text>
          <TouchableOpacity
            testID="admin-upload"
            style={[styles.primaryBtn, uploading && { opacity: 0.6 }]}
            onPress={pickAndUpload}
            disabled={uploading}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>
              {uploading ? "Parsing en cours..." : "Choisir des PDFs"}
            </Text>
          </TouchableOpacity>

          {uploadProgress && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        (uploadProgress.done / Math.max(uploadProgress.total, 1)) * 100
                      }%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {uploadProgress.done}/{uploadProgress.total} • {uploadProgress.current}
              </Text>
            </View>
          )}

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

        {/* AD3 — Announcements */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(280)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Annonces</Text>
          <Text style={styles.cardSub}>
            Affichez un message en haut de la landing pour tous les utilisateurs.
            Une seule annonce active à la fois.
          </Text>
          <TextInput
            testID="ann-text"
            style={styles.fieldInput}
            value={annText}
            onChangeText={setAnnText}
            placeholder="Votre message…"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
          />
          <View style={styles.levelRow}>
            {(["info", "success", "warning", "error"] as const).map((lvl) => (
              <TouchableOpacity
                key={lvl}
                onPress={() => setAnnLevel(lvl)}
                style={[styles.levelChip, annLevel === lvl && styles.levelChipActive]}
              >
                <Text
                  style={[
                    styles.levelChipText,
                    annLevel === lvl && styles.levelChipTextActive,
                  ]}
                >
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            testID="ann-publish"
            disabled={annLoading || !annText.trim()}
            style={[
              styles.primaryBtn,
              { marginTop: 8 },
              (annLoading || !annText.trim()) && { opacity: 0.5 },
            ]}
            onPress={createAnnouncement}
          >
            <Ionicons name="megaphone-outline" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Publier l&apos;annonce</Text>
          </TouchableOpacity>
          {announcements.length > 0 && (
            <View style={{ marginTop: 12 }}>
              {announcements.slice(0, 4).map((a) => (
                <View
                  key={a.id}
                  style={[
                    styles.annRow,
                    a.active && styles.annRowActive,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.annMessage} numberOfLines={2}>
                      {a.message}
                    </Text>
                    <Text style={styles.annMeta}>
                      {a.active ? "● ACTIVE" : "○ inactive"} • {a.level}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteAnnouncement(a.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.colors.accent} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* AD4 — Activity logs */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(320)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Activité récente</Text>
          <Text style={styles.cardSub}>
            Historique des dernières 20 actions admin (login, uploads, modifications).
          </Text>
          {logsLoading ? (
            <ActivityIndicator color={theme.colors.brand} style={{ marginTop: 8 }} />
          ) : (
            <View style={{ marginTop: 8 }}>
              {logs.slice(0, 12).map((l, i) => (
                <View key={l.id || i} style={styles.logRow}>
                  <View style={styles.logIcon}>
                    <Ionicons
                      name={
                        l.action === "auth.login"
                          ? "log-in-outline"
                          : l.action.startsWith("race.upload")
                          ? "cloud-upload-outline"
                          : l.action.startsWith("race.delete")
                          ? "trash-outline"
                          : l.action.startsWith("race.set_current")
                          ? "star-outline"
                          : l.action.startsWith("announcement.")
                          ? "megaphone-outline"
                          : "ellipse"
                      }
                      size={14}
                      color={theme.colors.brand}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logAction}>{l.action}</Text>
                    <Text style={styles.logMeta} numberOfLines={1}>
                      {l.email} • {formatDate(l.created_at)}
                    </Text>
                    {l.meta && Object.keys(l.meta).length > 0 && (
                      <Text style={styles.logExtra} numberOfLines={1}>
                        {Object.entries(l.meta)
                          .map(([k, v]) => `${k}: ${typeof v === "string" ? v.slice(0, 40) : v}`)
                          .join(" · ")}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {logs.length === 0 && (
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 6 }}>
                  Aucune activité.
                </Text>
              )}
            </View>
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
    fontFamily: theme.fonts.serifBlack,
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
    fontFamily: theme.fonts.serifBlack,
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
    fontFamily: theme.fonts.serifBlack,
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
  progressWrap: {
    marginTop: 12,
  },
  progressBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.gold,
  },
  progressText: {
    marginTop: 6,
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  levelRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },
  levelChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  levelChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  levelChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  levelChipTextActive: {
    color: "#fff",
  },
  annRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: "center",
  },
  annRowActive: {
    backgroundColor: "rgba(176, 141, 87, 0.06)",
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
    paddingLeft: 8,
  },
  annMessage: {
    fontSize: 12.5,
    color: theme.colors.textPrimary,
    fontWeight: "600",
    lineHeight: 17,
  },
  annMeta: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  logRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logAction: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  logMeta: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  logExtra: {
    fontSize: 10,
    color: theme.colors.gold,
    marginTop: 2,
    fontStyle: "italic",
  },

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
