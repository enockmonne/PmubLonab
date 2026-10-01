export type AppProduct = "core" | "analysis";

const rawProduct = process.env.EXPO_PUBLIC_APP_PRODUCT;
const appEnv = process.env.EXPO_PUBLIC_APP_ENV || "";

export const APP_PRODUCT: AppProduct =
  rawProduct === "analysis" || appEnv.includes("analysis") ? "analysis" : "core";

export const IS_ANALYSIS_APP = APP_PRODUCT === "analysis";

export const PRODUCT_NAME = IS_ANALYSIS_APP ? "PMU'B/LONAB/Analysis" : "PMU'B";
export const PRODUCT_OVERLINE = IS_ANALYSIS_APP ? "Recherche hippique" : "Le Journal Hippique";
export const PRODUCT_HOME_TITLE = IS_ANALYSIS_APP ? "Analysis" : "PMU'B";
