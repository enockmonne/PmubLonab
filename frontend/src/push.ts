import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./theme";

const DEVICE_ID_KEY = "pmub_device_id";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function getProjectId() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId
  );
}

async function registerForPushNotifications() {
  if (Platform.OS === "web" || !API_URL) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("pmub-updates", {
      name: "PMU'B updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") return;

  const projectId = getProjectId();
  if (!projectId) return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const deviceId = await getDeviceId();
  await fetch(`${API_URL}/api/push/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      device_id: deviceId,
      platform: Platform.OS,
      topics: ["race_updates", "results", "announcements"],
    }),
  });
}

export function usePushRegistration() {
  useEffect(() => {
    registerForPushNotifications().catch(() => {
      // Push is best-effort; the app should keep working if permissions or setup fail.
    });
  }, []);
}
