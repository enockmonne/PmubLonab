import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "./theme";

/**
 * Loader with a galloping horse silhouette.
 * Combines: a subtle bouncing translateY + rotate, plus moving "ground" lines.
 */
type Props = {
  size?: number;
  label?: string;
};

export default function HorseLoader({ size = 64, label }: Props) {
  const bounce = useSharedValue(0);
  const tilt = useSharedValue(0);
  const dust = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
    tilt.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 220 }),
        withTiming(7, { duration: 220 })
      ),
      -1,
      true
    );
    dust.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.linear }),
      -1,
      false
    );
  }, [bounce, tilt, dust]);

  const horseStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  const dust1 = useAnimatedStyle(() => ({
    opacity: 1 - dust.value,
    transform: [{ translateX: -dust.value * 30 }],
  }));
  const dust2 = useAnimatedStyle(() => ({
    opacity: 1 - dust.value,
    transform: [{ translateX: -dust.value * 22 + 12 }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.box, { width: size + 30, height: size + 24 }]}>
        <Animated.View style={[styles.horse, horseStyle]}>
          <Ionicons name="walk" size={size * 0.7} color={theme.colors.brand} />
        </Animated.View>
        <Animated.View style={[styles.dustWrap, dust1]}>
          <View style={styles.dust} />
        </Animated.View>
        <Animated.View style={[styles.dustWrap, dust2]}>
          <View style={[styles.dust, { width: 8 }]} />
        </Animated.View>
        <View style={styles.ground} />
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  box: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    overflow: "hidden",
  },
  horse: { marginBottom: 4 },
  ground: {
    height: 1.5,
    width: "70%",
    backgroundColor: theme.colors.gold,
    opacity: 0.5,
  },
  dustWrap: {
    position: "absolute",
    bottom: 4,
    left: "30%",
  },
  dust: {
    width: 14,
    height: 1.5,
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.55,
  },
  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 6,
  },
});
