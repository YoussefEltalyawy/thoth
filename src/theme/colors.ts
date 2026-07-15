// Palette derived directly from the design reference: warm cream background,
// near-black ink for text/buttons, deep olive-green for icon accents,
// warm amber for the streak flame. Keep new UI within this set rather
// than introducing ad-hoc colors per screen.

export const colors = {
  background: "#F5F2EA",
  surface: "#FFFFFF",
  surfaceMuted: "#EFEBDF",

  ink: "#2A2822",
  inkMuted: "#8A8578",
  inkFaint: "#B5B0A2",

  border: "#E7E2D3",

  accentOlive: "#4A5D3A",
  accentOliveDeep: "#33422A",
  accentAmber: "#C97A2B",

  pillBackground: "rgba(255,255,255,0.85)",
  pillText: "#2A2822",
} as const;

export type ThothColors = typeof colors;
