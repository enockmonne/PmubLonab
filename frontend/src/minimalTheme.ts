import { Platform } from "react-native";

export const minimalTheme = {
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  ink: "#0A0A0A",
  muted: "#666666",
  subtle: "#888888",
  line: "#E5E5E5",
  lineSoft: "#F0F0F0",
  accent: "#10B981", // emerald — only for live status
  tagBg: "#F0F0F0",
};

export const mono = Platform.select({
  ios: "Courier",
  android: "monospace",
  default: "ui-monospace, SFMono-Regular, Menlo, monospace",
}) as string;

export const sans = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
}) as string;
