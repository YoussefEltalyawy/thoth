import React from "react";
import { View, Text, ImageBackground, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { Topic } from "@/types";

interface Props {
  topic: Topic;
  imageUrl: string;
  onStart: () => void;
  onBookmark?: () => void;
}

export function TodayReadingCard({ topic, imageUrl, onStart, onBookmark }: Props) {
  return (
    <View style={styles.card}>
      <ImageBackground source={{ uri: imageUrl }} style={styles.image} imageStyle={styles.imageRadius}>
        <View style={styles.imageOverlayRow}>
          <View style={styles.pill}>
            <Ionicons name="location-outline" size={12} color={colors.pillText} />
            <Text style={styles.pillText}>{topic.category}</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="time-outline" size={12} color={colors.pillText} />
            <Text style={styles.pillText}>{topic.estimatedMinutes} min</Text>
          </View>
        </View>
      </ImageBackground>

      <View style={styles.body}>
        <Text style={styles.title}>{topic.title}</Text>
        {topic.subtitle ? <Text style={styles.subtitle}>{topic.subtitle}</Text> : null}
        <Text style={styles.excerpt} numberOfLines={2}>
          {topic.text}
        </Text>

        <View style={styles.actionsRow}>
          <Pressable style={styles.startButton} onPress={onStart}>
            <Text style={styles.startButtonText}>Start Reading</Text>
          </Pressable>
          <Pressable style={styles.bookmarkButton} onPress={onBookmark}>
            <Ionicons name="bookmark-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { height: 180, justifyContent: "flex-start" },
  imageRadius: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  imageOverlayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.pillBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.pillText, fontWeight: "600" },
  body: { padding: 20 },
  title: { fontFamily: typography.serif, fontSize: typography.sizes.xl, color: colors.ink, fontWeight: "600" },
  subtitle: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 2 },
  excerpt: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    marginTop: 10,
    lineHeight: 20,
  },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  startButton: {
    flex: 1,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  startButtonText: { fontFamily: typography.sans, color: colors.surface, fontSize: typography.sizes.base, fontWeight: "600" },
  bookmarkButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
