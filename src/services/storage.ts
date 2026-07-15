import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session, StreakState } from "@/types";

const SESSIONS_KEY = "thoth:sessions";
const STREAK_KEY = "thoth:streak";
const ONBOARDING_KEY = "thoth:onboarding";

export interface OnboardingPrefs {
  completed: boolean;
  name: string;
  avatarUri: string | null;
  selectedCategories: string[];
}

export async function getOnboardingPrefs(): Promise<OnboardingPrefs> {
  const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
  const defaults: OnboardingPrefs = { completed: false, name: "", avatarUri: null, selectedCategories: [] };
  if (!raw) return defaults;
  return { ...defaults, ...(JSON.parse(raw) as Partial<OnboardingPrefs>) };
}

export async function completeOnboarding(
  name: string,
  avatarUri: string | null,
  selectedCategories: string[]
): Promise<void> {
  const prefs: OnboardingPrefs = { completed: true, name, avatarUri, selectedCategories };
  await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(prefs));
}
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? (JSON.parse(raw) as Session[]) : [];
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  sessions.push(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  await updateStreakForNewSession(session.dateISO);
}

export async function getStreak(): Promise<StreakState> {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  if (!raw) {
    return { currentStreak: 0, longestStreak: 0, lastSessionDateISO: null, totalSessions: 0 };
  }
  return JSON.parse(raw) as StreakState;
}

function isConsecutiveDay(prevISO: string, nextISO: string): boolean {
  const prev = new Date(prevISO);
  const next = new Date(nextISO);
  const diffDays = Math.round((stripTime(next) - stripTime(prev)) / 86400000);
  return diffDays === 1;
}

function isSameDay(aISO: string, bISO: string): boolean {
  return stripTime(new Date(aISO)) === stripTime(new Date(bISO));
}

function stripTime(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Streak counts consecutive calendar days with at least one completed
// session — deliberately independent of score, per the plan: a bad
// reading shouldn't break the streak, only skipping a day does.
async function updateStreakForNewSession(dateISO: string): Promise<void> {
  const streak = await getStreak();

  let currentStreak = streak.currentStreak;
  if (!streak.lastSessionDateISO) {
    currentStreak = 1;
  } else if (isSameDay(streak.lastSessionDateISO, dateISO)) {
    // same-day second session doesn't increment the streak further
    currentStreak = Math.max(currentStreak, 1);
  } else if (isConsecutiveDay(streak.lastSessionDateISO, dateISO)) {
    currentStreak = streak.currentStreak + 1;
  } else {
    currentStreak = 1; // streak was broken
  }

  const next: StreakState = {
    currentStreak,
    longestStreak: Math.max(streak.longestStreak, currentStreak),
    lastSessionDateISO: dateISO,
    totalSessions: streak.totalSessions + 1,
  };

  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(next));
}

const BOOKMARKS_KEY = "thoth:bookmarks";

export async function getBookmarks(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function toggleBookmark(topicId: string): Promise<boolean> {
  const bookmarks = await getBookmarks();
  const index = bookmarks.indexOf(topicId);
  let isBookmarked = false;
  if (index === -1) {
    bookmarks.push(topicId);
    isBookmarked = true;
  } else {
    bookmarks.splice(index, 1);
  }
  await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  return isBookmarked;
}
