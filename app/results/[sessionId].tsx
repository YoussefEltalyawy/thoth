import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { getSessions } from "@/services/storage";
import { getTopicById } from "@/data/topics";
import {
  generateFeedback,
  getPaceBand,
  getPaceBandLabel,
  getWpmTargetLabel,
  buildHighlightedTranscript,
} from "@/services/scoring";
import { ScoreRing } from "@/components/ScoreRing";
import { MetricTile } from "@/components/MetricTile";
import { TranscriptView } from "@/components/TranscriptView";
import { Session } from "@/types";

export default function ResultsScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    getSessions().then((sessions) => {
      setSession(sessions.find((s) => s.id === sessionId) ?? null);
    });
  }, [sessionId]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const topic = getTopicById(session.topicId);
  const { metrics } = session;
  const feedback = generateFeedback(metrics);
  const paceBand = getPaceBand(metrics.wordsPerMinute);
  const highlightedWords = buildHighlightedTranscript(session.transcript);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => router.replace("/")}>
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Session Report</Text>
            <Text style={styles.headerSubtitle}>{topic?.title ?? "Session"}</Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreLabel}>Clarity Score</Text>
              <View style={styles.scoreValueRow}>
                <Text style={styles.scoreValue}>{metrics.compositeScore}</Text>
                <Text style={styles.scoreOutOf}>/100</Text>
              </View>
            </View>
            <ScoreRing score={metrics.compositeScore} />
          </View>
          <Text style={styles.headline}>{feedback.headline}</Text>
          <Text style={styles.subtext}>{feedback.subtext}</Text>
        </View>

        <View style={styles.grid}>
          <MetricTile
            icon="speedometer-outline"
            label="Avg Pace"
            value={String(metrics.wordsPerMinute)}
            unit="wpm"
            caption={`ideal ${getWpmTargetLabel()}`}
            status={paceBand === "ideal" ? "good" : "attention"}
          />
          <MetricTile
            icon="chatbubble-outline"
            label="Filler Words"
            value={String(metrics.fillerCount)}
            caption="total"
            status={metrics.fillerRate <= 5 ? "good" : "attention"}
          />
          <MetricTile
            icon="pause-outline"
            label="Hesitations"
            value={String(metrics.pauseCount + metrics.longPauseCount)}
            caption={metrics.longPauseCount === 0 ? "natural flow" : "a few long pauses"}
            status={metrics.longPauseCount === 0 ? "good" : "attention"}
          />
          <MetricTile
            icon="options-outline"
            label="Pace Band"
            value={getPaceBandLabel(paceBand)}
            caption={`target ${getWpmTargetLabel()} wpm ideal`}
            status={paceBand === "ideal" ? "good" : "attention"}
          />
        </View>

        <View style={styles.transcriptCard}>
          <Text style={styles.transcriptTitle}>What Thoth heard</Text>
          <TranscriptView words={highlightedWords} />
        </View>

        <Pressable style={styles.doneButton} onPress={() => router.replace("/")}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingTop: 20, paddingBottom: 40 },
  loading: { fontFamily: typography.serif, fontSize: typography.sizes.xl, color: colors.ink, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: typography.sans, fontSize: typography.sizes.lg, color: colors.ink, fontWeight: "700" },
  headerSubtitle: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 2 },
  scoreCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  scoreCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  scoreLabel: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted },
  scoreValueRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 4 },
  scoreValue: { fontFamily: typography.serif, fontSize: 48, color: colors.ink, fontWeight: "700", lineHeight: 50 },
  scoreOutOf: { fontFamily: typography.sans, fontSize: typography.sizes.base, color: colors.inkMuted, marginLeft: 4, marginBottom: 6 },
  headline: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.lg,
    color: colors.ink,
    fontStyle: "italic",
    marginTop: 18,
  },
  subtext: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  transcriptCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 24,
  },
  transcriptTitle: { fontFamily: typography.sans, fontSize: typography.sizes.base, color: colors.ink, fontWeight: "700", marginBottom: 12 },
  doneButton: { backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 18, alignItems: "center" },
  doneButtonText: { fontFamily: typography.sans, color: colors.surface, fontSize: typography.sizes.base, fontWeight: "600" },
});
