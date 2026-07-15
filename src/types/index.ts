export type LanguageTrack = "en" | "msa" | "egy";

export type ContentType = "reading" | "prompt";

export interface Topic {
  id: string;
  category: string;
  tier: "beginner" | "intermediate" | "dense";
  languageTrack: LanguageTrack;
  contentType: ContentType;
  title: string;
  subtitle?: string; // e.g. "After Seneca"
  text: string;
  estimatedMinutes: number;
  imageQuery?: string; // used to pick a hero image for the topic
}

// Standard internal transcript shape, independent of which ASR
// engine produced it (iOS on-device now, faster-whisper later).
// The scoring layer only ever depends on this shape.
export interface TranscriptWord {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number; // 0-1
}

export interface Transcript {
  text: string;
  words: TranscriptWord[];
  lowConfidence?: boolean; // flagged when the ASR engine itself reports low confidence
}

export interface SessionMetrics {
  wordsPerMinute: number;
  fillerCount: number;
  fillerRate: number; // fillers per 100 words
  pauseCount: number;
  longPauseCount: number;
  averageConfidence: number;
  compositeScore: number; // 0-100
}

export interface Session {
  id: string;
  topicId: string;
  languageTrack: LanguageTrack;
  contentType: ContentType;
  dateISO: string;
  durationMs: number;
  transcript: Transcript;
  metrics: SessionMetrics;
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastSessionDateISO: string | null;
  totalSessions: number;
}
