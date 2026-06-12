import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { API_URL, theme } from "./theme";
import { getDeviceId } from "./push";

const ACCESS_KEY = "pmub.betaAccess.v1";

const ACCESS_REQUIRED = process.env.EXPO_PUBLIC_BETA_ACCESS_REQUIRED === "true";

export default function BetaAccessGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(!ACCESS_REQUIRED);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!ACCESS_REQUIRED) {
        setChecking(false);
        return;
      }

      const saved = await AsyncStorage.getItem(ACCESS_KEY);
      if (!mounted) return;
      if (saved) {
        try {
          const verified = await verifyAccess(saved);
          if (mounted && verified) setAllowed(true);
        } catch {
          await AsyncStorage.removeItem(ACCESS_KEY);
        }
      }
      setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const verifyAccess = async (value: string) => {
    if (!API_URL) throw new Error("API non configuree");
    const deviceId = await getDeviceId();
    const res = await fetch(`${API_URL}/api/beta/access/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: value.trim().toUpperCase(),
        device_id: deviceId,
        platform: Platform.OS,
      }),
    });
    if (!res.ok) return false;
    const body = await res.json();
    return Boolean(body.ok);
  };

  const submit = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Entrez votre code d'accès.");
      return;
    }

    try {
      const verified = await verifyAccess(normalized);
      if (!verified) {
        setError("Code invalide ou expiré.");
        return;
      }
    } catch {
      setError("Connexion impossible. Réessayez dans un instant.");
      return;
    }

    await AsyncStorage.setItem(ACCESS_KEY, normalized);
    setAllowed(true);
    setError("");
  };

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  if (allowed) return <>{children}</>;

  return (
    <View style={styles.screen} testID="beta-access-gate">
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Ionicons name="lock-closed-outline" size={24} color={theme.colors.brand} />
        </View>
        <Text style={styles.overline}>Accès privé</Text>
        <Text style={styles.title}>{"PMU'B est en test"}</Text>
        <Text style={styles.body}>
          {
            "Entrez le code reçu pour accéder à la version de test. Ce code nous aide à contrôler qui peut utiliser l'application pendant la phase de feedback."
          }
        </Text>
        <TextInput
          testID="beta-access-code"
          style={styles.input}
          value={code}
          onChangeText={(value) => {
            setCode(value);
            setError("");
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={"Code d'accès"}
          placeholderTextColor={theme.colors.textSecondary}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          testID="beta-access-submit"
          style={styles.button}
          onPress={submit}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Entrer</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: theme.colors.bg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  iconBox: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 16,
  },
  overline: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: theme.colors.gold,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    fontFamily: theme.fonts.serifBlack,
    fontSize: 30,
    color: theme.colors.textPrimary,
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  input: {
    marginTop: 18,
    minHeight: 50,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  error: {
    marginTop: 8,
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  button: {
    marginTop: 16,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.brand,
  },
  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
