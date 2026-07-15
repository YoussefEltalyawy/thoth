import React, { useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { getTopicById } from "@/data/topics";
import { requestPermissions, startRecording, RecordingSession } from "@/services/speechRecognition";
import { computeMetrics } from "@/services/scoring";
import { saveSession } from "@/services/storage";
import { Session } from "@/types";

type Phase = "idle" | "recording" | "analyzing";

export default function RecordingScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const topic = getTopicById(topicId);

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [liveText, setLiveText] = useState("");
  const sessionRef = useRef<RecordingSession | null>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!topic) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Passage not found</Text>
      </SafeAreaView>
    );
  }

  const wordCount = liveText.trim().length > 0 ? liveText.trim().split(/\s+/).length : 0;
  const elapsedMinutes = elapsedMs / 60000;
  const liveWpm = elapsedMinutes > 0.05 ? Math.round(wordCount / elapsedMinutes) : null;

  async function handleStart() {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        "Microphone & speech access needed",
        "Thoth needs microphone and speech recognition permission to analyze your reading."
      );
      return;
    }
    setLiveText("");
    sessionRef.current = startRecording("en-US", (text) => setLiveText(text));
    startTimeRef.current = Date.now();
    setPhase("recording");
    intervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 200);
  }

  async function handleDone() {
    if (!sessionRef.current) return;
    setPhase("analyzing");
    if (intervalRef.current) clearInterval(intervalRef.current);

    const durationMs = Date.now() - startTimeRef.current;
    const transcript = await sessionRef.current.stop();
    const metrics = computeMetrics(transcript, durationMs);

    const session: Session = {
      id: `${topic.id}-${Date.now()}`,
      topicId: topic.id,
      languageTrack: topic.languageTrack,
      contentType: topic.contentType,
      dateISO: new Date().toISOString(),
      durationMs,
      transcript,
      metrics,
    };

    await saveSession(session);
    router.replace(`/results/${session.id}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>
              {topic.category} · {topic.estimatedMinutes} min
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{topic.title}</Text>
        <Text style={styles.passageText}>{topic.text}</Text>

        <View style={styles.listeningCard}>
          <View style={styles.listeningTopRow}>
            <View style={styles.listeningStatus}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: phase === "recording" ? colors.accentOlive : colors.inkFaint },
                ]}
              />
              <Text style={styles.listeningLabel}>
                {phase === "recording" ? "Listening…" : phase === "analyzing" ? "Analyzing…" : "Ready"}
              </Text>
            </View>
            <Text style={styles.wpmText}>{liveWpm !== null ? `${liveWpm} wpm` : "— wpm"}</Text>
          </View>
          <Text style={liveText ? styles.liveTranscript : styles.livePlaceholder}>
            {liveText || "Your words will appear here…"}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.wordCountText}>{wordCount} words spoken</Text>
        <View style={styles.controlsRow}>
          <Pressable
            style={[styles.micButton, phase === "recording" && styles.micButtonActive]}
            onPress={phase === "idle" ? handleStart : undefined}
            disabled={phase !== "idle"}
          >
            <Ionicons name="mic" size={26} color={colors.surface} />
          </Pressable>
          <Pressable
            style={[styles.doneButton, phase !== "recording" && styles.doneButtonDisabled]}
            onPress={handleDone}
            disabled={phase !== "recording"}
          >
            <Text style={styles.doneButtonText}>{phase === "analyzing" ? "Analyzing…" : "Done"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  metaPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaPillText: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted, fontWeight: "600" },
  title: { fontFamily: typography.serif, fontSize: typography.sizes.xxl, color: colors.ink, fontWeight: "700" },
  passageText: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.lg,
    color: colors.inkMuted,
    lineHeight: 28,
    marginTop: 16,
  },
  listeningCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
  },
  listeningTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listeningStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  listeningLabel: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.accentOlive, fontWeight: "600" },
  wpmText: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted },
  liveTranscript: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.ink, marginTop: 10, lineHeight: 20 },
  livePlaceholder: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkFaint, marginTop: 10 },
  footer: { padding: 20, paddingTop: 8 },
  wordCountText: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted, marginBottom: 12 },
  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.accentOlive,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: { backgroundColor: colors.accentAmber },
  doneButton: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  doneButtonDisabled: { opacity: 0.35 },
  doneButtonText: { fontFamily: typography.sans, fontSize: typography.sizes.base, color: colors.ink, fontWeight: "600" },
});
