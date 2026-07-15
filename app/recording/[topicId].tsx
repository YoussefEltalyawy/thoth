import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { getTopicById } from "@/data/topics";
import {
  isSpeechRecognitionAvailable,
  requestPermissions,
  startRecording,
  RecordingSession,
} from "@/services/speechRecognition";
import { computeMetrics } from "@/services/scoring";
import { saveSession } from "@/services/storage";
import { Session } from "@/types";

type Phase = "idle" | "recording" | "analyzing";
type WordState = "unspoken" | "correct" | "incorrect" | "active";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function normalize(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Aligns spoken words against passage words using greedy lookahead.
 * Used only for reading mode, not prompt mode.
 *
 *   correct   — spoken word matches passage word
 *   incorrect — spoken but doesn't match (shown red + underline)
 *   active    — the next word to be spoken (highlighted green)
 *   unspoken  — not yet reached (faded)
 */
function computeWordStates(passageWords: string[], spokenText: string): WordState[] {
  const states: WordState[] = new Array(passageWords.length).fill("unspoken");

  if (!spokenText.trim()) {
    if (passageWords.length > 0) states[0] = "active";
    return states;
  }

  const spokenRaw = spokenText.trim().split(/\s+/).filter(Boolean);
  const cleanPassage = passageWords.map(normalize);
  const cleanSpoken = spokenRaw.map(normalize);

  let pi = 0; // passage read head
  let si = 0; // spoken index

  while (si < cleanSpoken.length && pi < cleanPassage.length) {
    if (cleanSpoken[si] === cleanPassage[pi]) {
      states[pi] = "correct";
      pi++;
      si++;
    } else {
      // Look ahead in passage for the spoken word (handles skipped words)
      let foundAhead = false;
      for (let look = 1; look <= 3 && pi + look < cleanPassage.length; look++) {
        if (cleanSpoken[si] === cleanPassage[pi + look]) {
          for (let k = 0; k < look; k++) states[pi + k] = "incorrect";
          states[pi + look] = "correct";
          pi += look + 1;
          si++;
          foundAhead = true;
          break;
        }
      }
      if (!foundAhead) {
        states[pi] = "incorrect";
        pi++;
        si++;
      }
    }
  }

  // Next unread word is the active (currently being said) word
  if (pi < passageWords.length) states[pi] = "active";

  return states;
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function SpeechUnavailableBanner() {
  return (
    <View style={styles.warningBanner}>
      <Ionicons name="warning-outline" size={16} color="#92400E" />
      <Text style={styles.warningText}>
        Speech recognition requires a dev client build — not available in standard Expo Go.{" "}
        Run <Text style={styles.warningCode}>npx expo run:ios</Text> to build one.
      </Text>
    </View>
  );
}

interface BottomSheetProps {
  phase: Phase;
  elapsedMs: number;
  liveWpm: number | null;
  statsCenter: string; // third stat label for the center column
  statsCenterLabel: string;
  onStart: () => void;
  onCancel: () => void;
  onDone: () => void;
}

function BottomSheet({
  phase,
  elapsedMs,
  liveWpm,
  statsCenter,
  statsCenterLabel,
  onStart,
  onCancel,
  onDone,
}: BottomSheetProps) {
  return (
    <View style={styles.bottomSheet}>
      {phase === "analyzing" ? (
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={colors.accentOlive} />
          <Text style={styles.analyzingText}>Analyzing your speech…</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValue}>{formatTime(elapsedMs)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Pace</Text>
              <Text style={styles.statValue}>
                {liveWpm !== null ? `${liveWpm} WPM` : "— WPM"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>{statsCenterLabel}</Text>
              <Text style={styles.statValue}>{statsCenter}</Text>
            </View>
          </View>

          <View style={styles.controlsRow}>
            {phase === "idle" ? (
              <Pressable style={styles.startButton} onPress={onStart}>
                <Ionicons name="mic-outline" size={20} color={colors.surface} />
                <Text style={styles.startButtonText}>Start Speaking</Text>
              </Pressable>
            ) : (
              <>
                <Pressable style={styles.cancelButton} onPress={onCancel}>
                  <Ionicons name="trash-outline" size={20} color={colors.inkMuted} />
                </Pressable>
                <View style={styles.micRing}>
                  <View style={styles.micCore}>
                    <Ionicons name="mic" size={24} color={colors.surface} />
                  </View>
                </View>
                <Pressable style={styles.doneButton} onPress={onDone}>
                  <Text style={styles.doneButtonText}>Done</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.surface} />
                </Pressable>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────

export default function RecordingScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const topic = getTopicById(topicId);

  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [speechAvailable, setSpeechAvailable] = useState<boolean | null>(null);

  const sessionRef = useRef<RecordingSession | null>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSpeechAvailable(isSpeechRecognitionAvailable());
  }, []);

  const wordsArray = useMemo(
    () => (topic ? topic.text.split(/\s+/).filter(Boolean) : []),
    [topic]
  );

  const wordStates = useMemo<WordState[]>(() => {
    if (topic?.contentType !== "reading") return [];
    if (phase === "idle") {
      const s: WordState[] = new Array(wordsArray.length).fill("unspoken");
      if (wordsArray.length > 0) s[0] = "active";
      return s;
    }
    return computeWordStates(wordsArray, liveText);
  }, [wordsArray, liveText, phase, topic?.contentType]);

  const wordsRead = wordStates.filter((s) => s === "correct" || s === "incorrect").length;
  const totalWords = wordsArray.length;
  const spokenWordCount = liveText.trim() ? liveText.trim().split(/\s+/).length : 0;
  const elapsedMinutes = elapsedMs / 60000;
  const liveWpm = elapsedMinutes > 0.05 ? Math.round(spokenWordCount / elapsedMinutes) : null;

  if (!topic) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={styles.title}>Passage not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Shared handlers ─────────────────────────────────────────────────────

  async function handleStart() {
    if (speechAvailable === false) {
      Alert.alert(
        "Speech Recognition Unavailable",
        "Real speech recognition requires a development build.\n\nRun: npx expo run:ios",
        [{ text: "Got it" }]
      );
      return;
    }
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Enable microphone & speech access in your device Settings."
      );
      return;
    }
    setLiveText("");
    setElapsedMs(0);
    sessionRef.current = startRecording("en-US", (text) => setLiveText(text));
    startTimeRef.current = Date.now();
    setPhase("recording");
    intervalRef.current = setInterval(
      () => setElapsedMs(Date.now() - startTimeRef.current),
      200
    );
  }

  async function handleCancel() {
    Alert.alert("Reset Practice?", "Your progress won't be saved.", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          sessionRef.current?.stop();
          sessionRef.current = null;
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase("idle");
          setLiveText("");
          setElapsedMs(0);
        },
      },
    ]);
  }

  async function handleDone() {
    if (!topic || !sessionRef.current) return;
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

  // ─── Branch: prompt vs reading ───────────────────────────────────────────

  if (topic.contentType === "prompt") {
    return (
      <PromptScreen
        topic={topic}
        phase={phase}
        elapsedMs={elapsedMs}
        liveText={liveText}
        liveWpm={liveWpm}
        spokenWordCount={spokenWordCount}
        speechAvailable={speechAvailable}
        onBack={() => router.back()}
        onStart={handleStart}
        onCancel={handleCancel}
        onDone={handleDone}
      />
    );
  }

  // ─── Reading mode ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>
                {topic.category} · {topic.estimatedMinutes} min
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{topic.title}</Text>
          {topic.subtitle ? <Text style={styles.subtitle}>{topic.subtitle}</Text> : null}

          {speechAvailable === false && <SpeechUnavailableBanner />}

          {/* Word-by-word highlighted passage */}
          <View style={styles.passageContainer}>
            <Text style={styles.passageText}>
              {wordsArray.map((word, index) => {
                const state = wordStates[index];
                return (
                  <Text
                    key={index}
                    style={[
                      styles.wordBase,
                      state === "unspoken" && styles.wordUnspoken,
                      state === "correct" && styles.wordCorrect,
                      state === "incorrect" && styles.wordIncorrect,
                      state === "active" && styles.wordActive,
                    ]}
                  >
                    {word}{" "}
                  </Text>
                );
              })}
            </Text>
          </View>

          {phase === "recording" && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accentOlive }]} />
                <Text style={styles.legendText}>Current word</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#B91C1C" }]} />
                <Text style={styles.legendText}>Missed / wrong</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.ink }]} />
                <Text style={styles.legendText}>Correct</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <BottomSheet
          phase={phase}
          elapsedMs={elapsedMs}
          liveWpm={liveWpm}
          statsCenterLabel="Progress"
          statsCenter={phase === "idle" ? `0 / ${totalWords}` : `${wordsRead} / ${totalWords}`}
          onStart={handleStart}
          onCancel={handleCancel}
          onDone={handleDone}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Prompt screen (separate UI) ───────────────────────────────────────────

interface PromptScreenProps {
  topic: NonNullable<ReturnType<typeof getTopicById>>;
  phase: Phase;
  elapsedMs: number;
  liveText: string;
  liveWpm: number | null;
  spokenWordCount: number;
  speechAvailable: boolean | null;
  onBack: () => void;
  onStart: () => void;
  onCancel: () => void;
  onDone: () => void;
}

function PromptScreen({
  topic,
  phase,
  elapsedMs,
  liveText,
  liveWpm,
  spokenWordCount,
  speechAvailable,
  onBack,
  onStart,
  onCancel,
  onDone,
}: PromptScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} style={styles.closeButton}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <View style={[styles.metaPill, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={11} color="#92400E" style={{ marginRight: 4 }} />
              <Text style={[styles.metaPillText, { color: "#92400E" }]}>
                Free Prompt · {topic.estimatedMinutes} min
              </Text>
            </View>
          </View>

          {/* Category label */}
          <Text style={styles.promptEyebrow}>{topic.category}</Text>

          {/* Prompt card — this is the instruction, NOT something to read aloud */}
          <View style={styles.promptCard}>
            <View style={styles.promptCardHeader}>
              <Ionicons name="help-circle-outline" size={20} color={colors.accentAmber} />
              <Text style={styles.promptCardLabel}>Your prompt</Text>
            </View>
            <Text style={styles.promptCardText}>{topic.title}</Text>
            <Text style={styles.promptInstruction}>
              Speak freely in your own words for about {topic.estimatedMinutes} minutes.
              You will be scored on pace, fluency, and filler words — not the content.
            </Text>
          </View>

          {speechAvailable === false && <SpeechUnavailableBanner />}

          {/* Live transcript area */}
          {phase === "idle" ? (
            <View style={styles.transcriptIdle}>
              <Ionicons name="mic-outline" size={28} color={colors.inkFaint} />
              <Text style={styles.transcriptIdleText}>
                Tap "Start Speaking" when you're ready. Your words will appear here live.
              </Text>
            </View>
          ) : (
            <View style={styles.transcriptLive}>
              <View style={styles.transcriptLiveHeader}>
                <View style={styles.recordingDot} />
                <Text style={styles.transcriptLiveLabel}>Listening…</Text>
              </View>
              <Text style={styles.transcriptLiveText}>
                {liveText || "Start speaking…"}
              </Text>
            </View>
          )}

          {/* Word count hint */}
          {phase === "recording" && (
            <Text style={styles.wordCountHint}>{spokenWordCount} words spoken</Text>
          )}
        </ScrollView>

        <BottomSheet
          phase={phase}
          elapsedMs={elapsedMs}
          liveWpm={liveWpm}
          statsCenterLabel="Words"
          statsCenter={String(spokenWordCount)}
          onStart={onStart}
          onCancel={onCancel}
          onDone={onDone}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 260 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  metaPillText: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    fontWeight: "600",
  },

  // Reading mode
  title: { fontFamily: typography.serif, fontSize: 26, color: colors.ink, fontWeight: "700" },
  subtitle: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 4 },
  passageContainer: { marginTop: 24 },
  passageText: { fontFamily: typography.serif, fontSize: 21, lineHeight: 36 },
  wordBase: { fontFamily: typography.serif, fontSize: 21 },
  wordUnspoken: { color: colors.inkFaint },
  wordCorrect: { color: colors.ink },
  wordIncorrect: { color: "#B91C1C", textDecorationLine: "underline" },
  wordActive: { color: colors.accentOlive, fontWeight: "700" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted },

  // Prompt mode
  promptEyebrow: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.accentOlive,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  promptCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 24,
  },
  promptCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  promptCardLabel: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.xs,
    color: colors.accentAmber,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  promptCardText: {
    fontFamily: typography.serif,
    fontSize: 22,
    color: colors.ink,
    fontWeight: "700",
    lineHeight: 30,
    marginBottom: 12,
  },
  promptInstruction: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  transcriptIdle: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    gap: 12,
  },
  transcriptIdleText: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  transcriptLive: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    minHeight: 120,
  },
  transcriptLiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentOlive,
  },
  transcriptLiveLabel: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.xs,
    color: colors.accentOlive,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  transcriptLiveText: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.base,
    color: colors.ink,
    lineHeight: 24,
  },
  wordCountHint: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    marginTop: 12,
    textAlign: "right",
  },

  // Shared warning
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontFamily: typography.sans,
    fontSize: typography.sizes.xs,
    color: "#92400E",
    lineHeight: 16,
  },
  warningCode: {
    fontFamily: "monospace",
    backgroundColor: "#FDE68A",
    borderRadius: 3,
  },

  // Bottom sheet
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 16,
  },
  statCol: { alignItems: "center", flex: 1 },
  statLabel: {
    fontFamily: typography.sans,
    fontSize: 10,
    color: colors.inkMuted,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: typography.sans,
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 4,
  },
  statDivider: { width: 1, height: 24, backgroundColor: colors.border },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  startButton: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startButtonText: {
    fontFamily: typography.sans,
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  micRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(74, 93, 58, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  micCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentOlive,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  doneButtonText: {
    fontFamily: typography.sans,
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  analyzingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  analyzingText: {
    fontFamily: typography.sans,
    fontSize: 15,
    color: colors.inkMuted,
    fontWeight: "600",
    marginTop: 12,
  },
});
