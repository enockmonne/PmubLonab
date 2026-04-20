export const theme = {
  colors: {
    bg: "#FAF9F6",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F2ED",
    textPrimary: "#1A1A1A",
    textSecondary: "#5C5C5C",
    brand: "#0A2E1A",
    gold: "#B08D57",
    accent: "#E63946",
    border: "#E5E3D8",
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};

export const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const formatFCFA = (n: number) => {
  if (!n && n !== 0) return "-";
  return new Intl.NumberFormat("fr-FR").format(n) + " F CFA";
};

export const formatEuro = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n) + " €";
