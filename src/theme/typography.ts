import { Platform } from "react-native";

// Serif for passage titles/reading content (the editorial voice),
// system sans for UI chrome (labels, buttons, nav). Swap `serif`
// for a licensed display serif (e.g. Newsreader, Fraunces) later
// via expo-font — kept as system fonts here so the scaffold runs
// with zero extra asset setup.
export const typography = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),

  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
} as const;
