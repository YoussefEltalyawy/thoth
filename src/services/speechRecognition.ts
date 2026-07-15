import Constants from "expo-constants";
import { Transcript, TranscriptWord } from "@/types";

/**
 * Wraps on-device iOS speech recognition behind our standard Transcript
 * shape, so the scoring engine never has to know which ASR engine
 * produced the data. Phase 2 swaps the internals of this file for a
 * call to a local faster-whisper server — nothing outside this file
 * should need to change.
 *
 * Uses the `expo-speech-recognition` community package (verify the
 * exact API against its current docs before running — native module
 * APIs like this move fast between versions). Requires an EAS dev
 * client build; will not work inside Expo Go.
 *
 * EXPO GO FALLBACK: this native module isn't available in Expo Go,
 * so we detect it at runtime and use a mock recorder instead — lets
 * you explore the whole app (recording UI, scoring, results, streaks)
 * with plausible fake data before you've built a dev client at all.
 */

const isExpoGo = Constants.appOwnership === "expo";

export interface RecordingSession {
  stop: () => Promise<Transcript>;
}

export type InterimCallback = (liveText: string) => void;

export async function requestPermissions(): Promise<boolean> {
  if (isExpoGo) return true;
  const { ExpoSpeechRecognitionModule } = require("expo-speech-recognition");
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

/**
 * Starts on-device recognition and resolves a Transcript when stopped.
 * `onInterim` fires on every partial result so the recording screen can
 * show a live "what Thoth is hearing" preview, not just the final score.
 */
export function startRecording(
  languageCode: string = "en-US",
  onInterim?: InterimCallback
): RecordingSession {
  if (isExpoGo) return startMockRecording(onInterim);

  const { ExpoSpeechRecognitionModule } = require("expo-speech-recognition");

  const words: TranscriptWord[] = [];
  let finalText = "";
  let lowConfidence = false;

  const subscription = ExpoSpeechRecognitionModule.addListener(
    "result",
    (event: any) => {
      const result = event.results[0];
      if (!result) return;

      onInterim?.(result.transcript ?? "");

      if (!event.isFinal) return;
      finalText = result.transcript;

      // Segment-level timing/confidence — coarser than word-level,
      // which is the known Phase 1 tradeoff vs. Whisper in Phase 2.
      const segments = result.segments ?? [];
      for (const seg of segments) {
        words.push({
          word: seg.substring ?? "",
          startMs: Math.round((seg.timestamp ?? 0) * 1000),
          endMs: Math.round(((seg.timestamp ?? 0) + (seg.duration ?? 0)) * 1000),
          confidence: seg.confidence ?? result.confidence ?? 0.8,
        });
        if ((seg.confidence ?? 1) < 0.5) lowConfidence = true;
      }
    }
  );

  ExpoSpeechRecognitionModule.start({
    lang: languageCode,
    interimResults: true,
    continuous: true,
    requiresOnDeviceRecognition: true,
    addsPunctuation: false,
  });

  return {
    stop: async () => {
      ExpoSpeechRecognitionModule.stop();
      subscription.remove();
      return { text: finalText, words, lowConfidence };
    },
  };
}

// --- Expo Go mock: progressively reveals a plausible transcript so the
// live "Listening…" panel and final scoring both have real behavior to
// show, with no native build required. ---
const MOCK_SENTENCE =
  "We live in an age that has declared war on um waiting every delay is a problem to be solved you know";

function startMockRecording(onInterim?: InterimCallback): RecordingSession {
  const startedAt = Date.now();
  const sampleWords = MOCK_SENTENCE.split(" ");
  let revealedCount = 0;

  const interval = setInterval(() => {
    if (revealedCount < sampleWords.length) {
      revealedCount++;
      onInterim?.(sampleWords.slice(0, revealedCount).join(" "));
    }
  }, 380);

  return {
    stop: async () => {
      clearInterval(interval);
      const durationMs = Math.max(Date.now() - startedAt, 4000);

      const words: TranscriptWord[] = [];
      let cursor = 0;
      for (const word of sampleWords) {
        const wordDurationMs = 260;
        const gapMs = word === "um" || word === "you" ? 650 : 90;
        cursor += gapMs;
        words.push({ word, startMs: cursor, endMs: cursor + wordDurationMs, confidence: 0.9 });
        cursor += wordDurationMs;
      }

      return { text: sampleWords.join(" "), words, lowConfidence: false };
    },
  };
}
