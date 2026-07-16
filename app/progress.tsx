import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { getSessions, getStreak } from "@/services/storage";
import { getTopicById } from "@/data/topics";
import { Session, StreakState } from "@/types";

export default function ProgressScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState<StreakState | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSessions().then((all) => setSessions([...all].reverse()));
      getStreak().then(setStreak);
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>Your progress</Text>
        </View>
        {streak ? (
          <Text style={styles.subtitle}>
            {streak.currentStreak}-day streak · {streak.totalSessions} sessions total
          </Text>
        ) : null}

        {/* Phase 2 note: split these by language_track once MSA/Egyptian
            tracks exist — a merged trend line loses signal, per the plan. */}
        {sessions.length === 0 && (
          <Text style={styles.empty}>No sessions yet — finish a reading to see it here.</Text>
        )}

        {sessions.map((session) => {
          const topic = getTopicById(session.topicId);
          return (
            <View key={session.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{topic?.title ?? session.topicId}</Text>
                <Text style={styles.rowDate}>
                  {new Date(session.dateISO).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <Text style={styles.rowScore}>{session.metrics.compositeScore}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: typography.serif, fontSize: typography.sizes.xxl, color: colors.ink, fontWeight: "700" },
  subtitle: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 6, marginBottom: 24 },
  empty: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  rowLeft: {},
  rowTitle: { fontFamily: typography.sans, fontSize: typography.sizes.base, color: colors.ink, fontWeight: "600" },
  rowDate: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted, marginTop: 2 },
  rowScore: { fontFamily: typography.serif, fontSize: typography.sizes.xl, color: colors.accentOlive, fontWeight: "700" },
});
