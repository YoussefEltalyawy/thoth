import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export function StreakBadge({ days }: { days: number }) {
  return (
    <View style={styles.row}>
      <Ionicons name="flame" size={16} color={colors.accentAmber} />
      <Text style={styles.text}>{days}-day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  text: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.accentAmber,
    fontWeight: "600",
  },
});
