import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";

/**
 * Persistent floating V1 / V2 design toggle.
 * - Sits top-right, safe for any screen.
 * - Auto-detects current version from route.
 * - Tap toggles between the two.
 */
export default function VersionToggle() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const isV2 = pathname.startsWith("/v2");

  return (
    <View pointerEvents="box-none" style={styles.wrap} testID="version-toggle">
      <View style={styles.pill}>
        <TouchableOpacity
          testID="toggle-v1"
          onPress={() => {
            if (isV2) router.replace("/");
          }}
          activeOpacity={0.7}
          style={[styles.seg, !isV2 && styles.segActive]}
        >
          <Text style={[styles.segText, !isV2 && styles.segTextActive]}>V1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="toggle-v2"
          onPress={() => {
            if (!isV2) router.replace("/v2");
          }}
          activeOpacity={0.7}
          style={[styles.seg, isV2 && styles.segActive]}
        >
          <Text style={[styles.segText, isV2 && styles.segTextActive]}>V2</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: Platform.OS === "web" ? 14 : 54,
    right: 12,
    zIndex: 999,
    elevation: 20,
  },
  pill: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: 999,
    padding: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  seg: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    minWidth: 32,
    alignItems: "center",
  },
  segActive: {
    backgroundColor: "#0A0A0A",
  },
  segText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1,
  },
  segTextActive: {
    color: "#FFFFFF",
  },
});
