import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { Topic } from "@/types";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Philosophy: "bulb-outline",
  Discipline: "scan-outline",
  "Human Nature": "walk-outline",
  Ethics: "leaf-outline",
  Psychology: "people-outline",
  Science: "flask-outline",
};

export function PassageListItem({ topic, onPress }: { topic: Topic; onPress: () => void }) {
  const icon = CATEGORY_ICONS[topic.category] ?? "document-text-outline";

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{topic.title}</Text>
        <Text style={styles.category}>{topic.category}</Text>
      </View>
      <Text style={styles.duration}>{topic.estimatedMinutes} min</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1 },
  title: { fontFamily: typography.sans, fontSize: typography.sizes.base, color: colors.ink, fontWeight: "600" },
  category: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted, marginTop: 2 },
  duration: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted },
});
