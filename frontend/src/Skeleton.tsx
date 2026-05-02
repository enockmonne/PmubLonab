import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { theme } from "./theme";

type Props = {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
};

/**
 * Animated skeleton block with a "shimmer" pulse.
 */
export function Skeleton({ width = "100%", height = 12, style, borderRadius = 4 }: Props) {
  const progress = useSharedValue(0.5);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({ opacity: 0.45 + 0.45 * progress.value }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceAlt,
        },
        style,
      ]}
    />
  );
}

/**
 * Compose a skeleton row similar to a horse list item.
 */
export function HorseRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={42} height={42} borderRadius={21} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="80%" height={10} />
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          <Skeleton width={48} height={18} />
          <Skeleton width={56} height={18} />
          <Skeleton width={70} height={18} />
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Skeleton width={32} height={20} />
        <Skeleton width={22} height={9} />
      </View>
    </View>
  );
}

export function HorseListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          <HorseRowSkeleton />
          {i < count - 1 && <View style={styles.sep} />}
        </View>
      ))}
    </View>
  );
}

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={70} height={11} />
      <View style={{ height: 8 }} />
      <Skeleton width="80%" height={20} />
      <View style={{ height: 12 }} />
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Skeleton width={70} height={28} />
        <Skeleton width={70} height={28} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  sep: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
  },
});
