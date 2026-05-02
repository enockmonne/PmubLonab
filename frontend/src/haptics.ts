import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Cross-platform haptics helper.
 * Web: no-op. iOS/Android: triggers device vibration / haptic feedback.
 */
export const haptics = {
  light: () => {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: () => {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy: () => {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  success: () => {
    if (Platform.OS === "web") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning: () => {
    if (Platform.OS === "web") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error: () => {
    if (Platform.OS === "web") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  selection: () => {
    if (Platform.OS === "web") return;
    Haptics.selectionAsync().catch(() => {});
  },
};
