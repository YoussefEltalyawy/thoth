import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  caption: string;
  status: "good" | "attention";
}

export function MetricTile({ icon, label, value, unit, caption, status }: Props) {
  const badgeColor = status === "good" ? colors.accentOlive : colors.accentAmber;
  const badgeBg = status === "good" ? "#EAF0E4" : "#F7E9D8";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <Ionicons name={icon} size={14} color={colors.inkMuted} />
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.caption}>{caption}</Text>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Ionicons
            name={status === "good" ? "checkmark" : "arrow-up"}
            size={12}
            color={badgeColor}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted },
  valueRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 8 },
  value: { fontFamily: typography.serif, fontSize: 30, color: colors.ink, fontWeight: "700", lineHeight: 32 },
  unit: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginBottom: 4 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  caption: { fontFamily: typography.sans, fontSize: 11, color: colors.inkFaint, flex: 1 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});
