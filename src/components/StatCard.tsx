import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: number;
  onPress?: () => void;
}

export function StatCard({ icon, iconColor, label, value, onPress }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={16} color={iconColor} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        <Pressable style={styles.arrowButton} onPress={onPress}>
          <Ionicons name="arrow-forward" size={14} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted },
  valueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  value: { fontFamily: typography.serif, fontSize: 32, color: colors.ink, fontWeight: "700" },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
