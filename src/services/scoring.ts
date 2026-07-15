import { SessionMetrics, Transcript } from "@/types";

// English filler list for Phase 1. Each language track gets its own
// list — do not extend this one when Arabic tracks are added in
// Phase 2, add a sibling list per the plan doc instead.
//
// NOTE: iOS on-device ASR may silently drop some fillers with smart
// formatting enabled. We set iosTaskHint:"unspecified" in speechRecognition.ts
// to maximize pass-through, and also scan the raw text here to catch
// any that slipped through as part of a longer token.
const FILLER_WORDS_EN = new Set([
  // Hesitation sounds
  "um", "umm", "ummm",
  "uh", "uhh",
  "er", "err",
  "ugh",
  "hmm", "hm", "hmm",
  "huh",
  "ah", "ahh",
  // Conversational fillers
  "like",
  "basically",
  "actually",
  "literally",
  "obviously",
  "seriously",
  "honestly",
  "right",
  "okay",
  "well",
  "so",
  "anyway",
  "anyways",
  "you know",
  "i mean",
  "i think",
  "kind of",
  "sort of",
  "you see",
]);

const NOTABLE_PAUSE_MS = 500;
const LONG_PAUSE_MS = 1500;

// Natural conversational pace for English. Calibrate a separate
// range per track rather than reusing this number for Arabic.
const WPM_TARGET_RANGE: [number, number] = [120, 150];

export function computeWordsPerMinute(transcript: Transcript, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const wordCount = transcript.words.length;
  return Math.round((wordCount / durationMs) * 60000);
}

export function countFillers(transcript: Transcript): number {
  const text = transcript.text.toLowerCase();
  let count = 0;
  for (const filler of FILLER_WORDS_EN) {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(`\\b${escaped}\\b`, "g"));
    count += matches ? matches.length : 0;
  }
  return count;
}

export function countPauses(transcript: Transcript): { pauseCount: number; longPauseCount: number } {
  let pauseCount = 0;
  let longPauseCount = 0;
  for (let i = 1; i < transcript.words.length; i++) {
    const gap = transcript.words[i].startMs - transcript.words[i - 1].endMs;
    if (gap >= LONG_PAUSE_MS) {
      longPauseCount++;
    } else if (gap >= NOTABLE_PAUSE_MS) {
      pauseCount++;
    }
  }
  return { pauseCount, longPauseCount };
}

export function averageConfidence(transcript: Transcript): number {
  if (transcript.words.length === 0) return 0;
  const sum = transcript.words.reduce((acc, w) => acc + w.confidence, 0);
  return sum / transcript.words.length;
}

// Composite score is a weighted blend, but always surface the
// sub-scores in the UI — the point is showing which metric is
// improving, not hiding everything behind one number.
export function computeMetrics(transcript: Transcript, durationMs: number): SessionMetrics {
  const wordsPerMinute = computeWordsPerMinute(transcript, durationMs);
  const fillerCount = countFillers(transcript);
  const wordCount = Math.max(transcript.words.length, 1);
  const fillerRate = (fillerCount / wordCount) * 100;
  const { pauseCount, longPauseCount } = countPauses(transcript);
  const confidence = averageConfidence(transcript);

  const paceScore = scoreWithinRange(wordsPerMinute, WPM_TARGET_RANGE);
  const fillerScore = clamp(100 - fillerRate * 8, 0, 100);
  const pauseScore = clamp(100 - longPauseCount * 12 - pauseCount * 4, 0, 100);
  const confidenceScore = confidence * 100;

  const compositeScore = Math.round(
    paceScore * 0.3 + fillerScore * 0.3 + pauseScore * 0.25 + confidenceScore * 0.15
  );

  return {
    wordsPerMinute,
    fillerCount,
    fillerRate: Math.round(fillerRate * 10) / 10,
    pauseCount,
    longPauseCount,
    averageConfidence: Math.round(confidence * 100) / 100,
    compositeScore,
  };
}

function scoreWithinRange(value: number, [min, max]: [number, number]): number {
  if (value >= min && value <= max) return 100;
  const distance = value < min ? min - value : value - max;
  return clamp(100 - distance * 1.5, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// --- Feedback + transcript highlighting for the results screen ---

export type PaceBand = "slow" | "ideal" | "fast";

export function getPaceBand(wpm: number): PaceBand {
  const [min, max] = WPM_TARGET_RANGE;
  if (wpm < min) return "slow";
  if (wpm > max) return "fast";
  return "ideal";
}

export function getPaceBandLabel(band: PaceBand): string {
  return { slow: "Slow", ideal: "Ideal", fast: "Fast" }[band];
}

export function getWpmTargetLabel(): string {
  return `${WPM_TARGET_RANGE[0]}–${WPM_TARGET_RANGE[1]}`;
}

export interface SessionFeedback {
  headline: string;
  subtext: string;
}

// Simple rule-based feedback — no ML needed, just surfaces the metric
// that most needs attention this session, in plain language.
export function generateFeedback(metrics: SessionMetrics): SessionFeedback {
  const [min, max] = WPM_TARGET_RANGE;
  const band = getPaceBand(metrics.wordsPerMinute);

  if (band === "slow") {
    return {
      headline: metrics.compositeScore >= 70 ? "Well paced — keep it up" : "A little slow today",
      subtext: `Slightly slow — ${metrics.wordsPerMinute} wpm, aim for ${min}–${max}.`,
    };
  }
  if (band === "fast") {
    return {
      headline: "Watch your pace",
      subtext: `Running a bit fast — ${metrics.wordsPerMinute} wpm, aim for ${min}–${max}.`,
    };
  }
  if (metrics.fillerRate > 5) {
    return {
      headline: "Good pace, watch the fillers",
      subtext: `${metrics.fillerCount} filler word${metrics.fillerCount === 1 ? "" : "s"} this session.`,
    };
  }
  if (metrics.longPauseCount > 2) {
    return {
      headline: "Good pace, a few long pauses",
      subtext: `${metrics.longPauseCount} long pause${metrics.longPauseCount === 1 ? "" : "s"} — worth noticing, not fixing yet.`,
    };
  }
  return {
    headline: "Well paced — keep it up",
    subtext: `Right in your natural range — ${metrics.wordsPerMinute} wpm.`,
  };
}

export type PauseMarker = "none" | "short" | "long";

export interface HighlightedWord {
  word: string;
  isFiller: boolean;
  pauseBefore: PauseMarker;
}

// Drives the "What Thoth heard" transcript view — flags each word as
// filler/not, and flags the gap before it as a notable/long pause.
export function buildHighlightedTranscript(transcript: Transcript): HighlightedWord[] {
  const result: HighlightedWord[] = [];
  for (let i = 0; i < transcript.words.length; i++) {
    const w = transcript.words[i];
    const isFiller = FILLER_WORDS_EN.has(w.word.toLowerCase().replace(/[.,!?]/g, ""));

    let pauseBefore: PauseMarker = "none";
    if (i > 0) {
      const gap = w.startMs - transcript.words[i - 1].endMs;
      if (gap >= LONG_PAUSE_MS) pauseBefore = "long";
      else if (gap >= NOTABLE_PAUSE_MS) pauseBefore = "short";
    }

    result.push({ word: w.word, isFiller, pauseBefore });
  }
  return result;
}
