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
function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

/**
 * Merges a newly-finalized segment into the running transcript.
 *
 * iOS's on-device recognizer doesn't reliably behave one way: sometimes a
 * "final" segment is a genuinely new chunk of speech (safe to append), but
 * sometimes it's actually a re-statement of everything said so far in the
 * session (appending would duplicate the whole thing — very likely the
 * cause of highlighting drift, since duplicated text makes the word-aligner
 * think far more was said than actually was, overshooting ahead into
 * unspoken passage text). We detect which case we're in by checking
 * whether one is a prefix of the other, rather than assuming either model.
 */
function mergeFinalSegment(cumulativeText: string, segmentText: string): string {
  if (!segmentText) return cumulativeText;
  if (!cumulativeText) return segmentText;

  const normCum = normalizeForCompare(cumulativeText);
  const normSeg = normalizeForCompare(segmentText);

  if (normSeg.startsWith(normCum)) {
    // segmentText already contains everything we had — it's the fuller
    // version, not a new increment. Replace, don't append.
    return segmentText;
  }
  if (normCum.startsWith(normSeg)) {
    // segmentText is a shrunk/partial restatement of what we already have
    // — keep what we've got, ignore this one.
    return cumulativeText;
  }
  return `${cumulativeText} ${segmentText}`;
}

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
        // Commit this segment to the running transcript — defensively,
        // since we can't fully rely on this being a clean incremental delta.
        cumulativeText = mergeFinalSegment(cumulativeText, segmentText);

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
        // Interim: same defensive merge, applied to a throwaway preview
        // string (doesn't mutate cumulativeText) — avoids the live view
        // duplicating text the same way a bad final would.
        const live = mergeFinalSegment(cumulativeText, segmentText);
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
    // EXPERIMENTAL: switched from "unspecified" to "dictation" — Apple's
    // docs describe "dictation" as the most verbatim/literal transcription
    // mode, which should in theory be more likely to preserve "um"/"uh"
    // rather than cleaning them out. Untested against the alternative on
    // a real device as of this change — if fillers still don't come
    // through, this is a genuine on-device ASR limitation rather than a
    // config issue, and the real fix is the planned Phase 2 Whisper swap.
    iosTaskHint: "dictation",
  });

  return {
    stop: async () => {
      ExpoSpeechRecognitionModule.stop();
      subscription.remove();
      return { text: cumulativeText, words, lowConfidence };
    },
  };
}
