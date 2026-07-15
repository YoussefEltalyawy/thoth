import Constants from "expo-constants";
import { Transcript, TranscriptWord } from "@/types";

// Native module errors in React Native can escape try/catch when the module
// isn't linked. We must check Expo Go BEFORE calling require().
const isExpoGo = Constants.appOwnership === "expo";

/**
 * Returns true if the expo-speech-recognition native module is actually linked
 * and available at runtime. This is false in standard Expo Go (native modules
 * not in Expo Go's core aren't available), but true in dev clients and
 * production builds that include the native module.
 */
export function isSpeechRecognitionAvailable(): boolean {
  if (isExpoGo) return false; // Never attempt require in Expo Go
  try {
    const mod = require("expo-speech-recognition");
    return !!(mod?.ExpoSpeechRecognitionModule?.start);
  } catch {
    return false;
  }
}

export interface RecordingSession {
  stop: () => Promise<Transcript>;
}

export type InterimCallback = (liveText: string) => void;

export async function requestPermissions(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const { ExpoSpeechRecognitionModule } = require("expo-speech-recognition");
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch (e) {
    console.warn("expo-speech-recognition not available:", e);
    return false;
  }
}

/**
 * Starts on-device speech recognition and returns a session handle.
 *
 * KEY DESIGN: `onInterim` receives the FULL cumulative transcript so far
 * (not just the latest partial segment). With `continuous: true`, each
 * segment finalises independently. We accumulate finals and append the
 * current partial, giving the recording screen a single growing string to
 * drive the word-by-word passage highlighting.
 *
 * Throws if the native module is not linked — callers must check
 * isSpeechRecognitionAvailable() first.
 */
export function startRecording(
  languageCode: string = "en-US",
  onInterim?: InterimCallback
): RecordingSession {
  if (isExpoGo) {
    throw new Error("Speech recognition is not available in Expo Go. Please use a dev client build.");
  }
  const { ExpoSpeechRecognitionModule } = require("expo-speech-recognition");

  const words: TranscriptWord[] = [];
  let cumulativeText = ""; // all finalised segments joined together
  let lowConfidence = false;

  const subscription = ExpoSpeechRecognitionModule.addListener(
    "result",
    (event: any) => {
      const result = event.results?.[0];
      if (!result) return;

      const segmentText = (result.transcript ?? "").trim();

      if (event.isFinal) {
        // Commit this segment to the running transcript
        if (segmentText) {
          cumulativeText = cumulativeText
            ? `${cumulativeText} ${segmentText}`
            : segmentText;
        }

        // Collect word-level timing metadata if the engine provides it
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

        onInterim?.(cumulativeText);
      } else {
        // Interim: show everything confirmed so far + current partial
        const live = cumulativeText
          ? segmentText
            ? `${cumulativeText} ${segmentText}`
            : cumulativeText
          : segmentText;
        onInterim?.(live);
      }
    }
  );

  ExpoSpeechRecognitionModule.start({
    lang: languageCode,
    interimResults: true,
    continuous: true,
    requiresOnDeviceRecognition: true,
    addsPunctuation: false,
    // Disable smart formatting so the engine doesn't silently strip
    // filler words (um, uh, ugh) before we can score them.
    iosTaskHint: "unspecified",
  });

  return {
    stop: async () => {
      ExpoSpeechRecognitionModule.stop();
      subscription.remove();
      return { text: cumulativeText, words, lowConfidence };
    },
  };
}
