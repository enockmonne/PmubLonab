export const theme = {
  colors: {
    bg: "#F3F6F8",
    surface: "#FFFFFF",
    surfaceAlt: "#EAF0F4",
    textPrimary: "#172631",
    textSecondary: "#5D6B76",
    brand: "#173F5F",
    brandStrong: "#0D2B42",
    brandMuted: "#C6D8E5",
    gold: "#B87528",
    accent: "#0F8177",
    border: "#D6E0E7",
    searchSurface: "#FFFFFF",
    searchBorder: "#A9C2D2",
    searchText: "#132838",
    searchMuted: "#708594",
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  fonts: {
    serif: "Inter_700Bold",
    serifBlack: "Inter_900Black",
    serifItalic: "Inter_400Regular",
    sans: "Inter_400Regular",
    sansBold: "Inter_700Bold",
    sansBlack: "Inter_900Black",
  },
};

export const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const ADMIN_WEB_URL =
  process.env.EXPO_PUBLIC_ADMIN_WEB_URL || "https://pmublonab-staging-admin.onrender.com";

export const formatFCFA = (n: number) => {
  if (!n && n !== 0) return "-";
  return new Intl.NumberFormat("fr-FR").format(n) + " F CFA";
};

export const formatEuro = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n) + " €";
