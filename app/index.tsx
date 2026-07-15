import React, { useCallback, useState, useMemo } from "react";
import { View, Text, Image, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { StreakBadge } from "@/components/StreakBadge";
import { TodayReadingCard } from "@/components/TodayReadingCard";
import { StatCard } from "@/components/StatCard";
import { PassageListItem } from "@/components/PassageListItem";
import { topics } from "@/data/topics";
import { getStreak, getOnboardingPrefs, resetOnboarding, getBookmarks, toggleBookmark } from "@/services/storage";
import { StreakState } from "@/types";

const CATEGORIES = ["Philosophy", "Ethics", "Psychology", "Discipline", "Human Nature", "Science"];
const FILTERS = ["All", "Bookmarks", ...CATEGORIES];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

export default function HomeScreen() {
  const router = useRouter();
  const [streak, setStreak] = useState<StreakState>({
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDateISO: null,
    totalSessions: 0,
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  
  const [filterCategory, setFilterCategory] = useState("All");
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getOnboardingPrefs().then((prefs) => {
        if (cancelled) return;
        if (!prefs.completed) {
          router.replace("/onboarding");
          return;
        }
        setSelectedCategories(prefs.selectedCategories);
        setName(prefs.name);
        setAvatarUri(prefs.avatarUri);
        setCheckingOnboarding(false);
      });
      getStreak().then(setStreak);
      getBookmarks().then(setBookmarks);
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Categorize topics based on user preferences
  const orderedTopics = useMemo(() => {
    const preferredTopics =
      selectedCategories.length > 0
        ? topics.filter((t) => selectedCategories.includes(t.category))
        : topics;
    return [
      ...preferredTopics,
      ...topics.filter((t) => !preferredTopics.includes(t)),
    ];
  }, [selectedCategories]);

  const featuredTopic = orderedTopics[0];
  const explorePassages = orderedTopics.slice(1);

  // Filter topics for the explore list
  const filteredTopics = useMemo(() => {
    if (filterCategory === "Bookmarks") {
      return topics.filter((t) => bookmarks.includes(t.id));
    }
    if (filterCategory !== "All") {
      return topics.filter((t) => t.category === filterCategory);
    }
    return explorePassages;
  }, [explorePassages, filterCategory, bookmarks]);

  const isFeaturedBookmarked = bookmarks.includes(featuredTopic?.id);

  async function handleToggleFeaturedBookmark() {
    if (!featuredTopic) return;
    const isNowBookmarked = await toggleBookmark(featuredTopic.id);
    setBookmarks((prev) =>
      isNowBookmarked
        ? [...prev, featuredTopic.id]
        : prev.filter((id) => id !== featuredTopic.id)
    );
  }

  if (checkingOnboarding) {
    return <SafeAreaView style={styles.safe} />;
  }

  const showFeatured = filterCategory === "All" && featuredTopic;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: avatarUri ?? "https://i.pravatar.cc/150?u=thoth-user" }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>
                {getGreeting()} {name.trim() ? name.trim().split(" ")[0] : ""}
              </Text>
              <StreakBadge days={streak.currentStreak} />
            </View>
          </View>
          <Pressable style={styles.bellButton} onPress={() => router.push("/progress")}>
            <Ionicons name="stats-chart" size={18} color={colors.ink} />
          </Pressable>
        </View>

        {/* Stats Summary Row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="flame"
            iconColor={colors.accentAmber}
            label="Day Streak"
            value={streak.currentStreak}
            onPress={() => router.push("/progress")}
          />
          <StatCard
            icon="book-outline"
            iconColor={colors.accentOlive}
            label="Sessions"
            value={streak.totalSessions}
            onPress={() => router.push("/progress")}
          />
        </View>

        {/* Today's Reading Section */}
        {showFeatured && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionLabel}>Today's Featured Reading</Text>
            <TodayReadingCard
              topic={featuredTopic}
              imageUrl={`https://picsum.photos/seed/${featuredTopic.id}/600/400`}
              onStart={() => router.push(`/recording/${featuredTopic.id}`)}
              onBookmark={handleToggleFeaturedBookmark}
              isBookmarked={isFeaturedBookmarked}
            />
          </View>
        )}

        {/* Explore Section with Filter pills */}
        <View style={styles.exploreSectionHeader}>
          <Text style={styles.sectionLabel}>
            {filterCategory === "Bookmarks" ? "Your Bookmarked Passages" : "Explore Passages"}
          </Text>
        </View>

        {/* Scrollable Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTERS.map((cat) => {
            const active = filterCategory === cat;
            const isBookmark = cat === "Bookmarks";
            return (
              <Pressable
                key={cat}
                onPress={() => setFilterCategory(cat)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                {isBookmark && (
                  <Ionicons
                    name="bookmark"
                    size={12}
                    color={active ? colors.surface : colors.accentAmber}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Passages List or Empty State */}
        {filteredTopics.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredTopics.map((topic) => (
              <PassageListItem
                key={topic.id}
                topic={topic}
                onPress={() => router.push(`/recording/${topic.id}`)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={filterCategory === "Bookmarks" ? "bookmark-outline" : "folder-open-outline"}
                size={40}
                color={colors.inkMuted}
              />
            </View>
            <Text style={styles.emptyStateTitle}>
              {filterCategory === "Bookmarks" ? "No Bookmarks Yet" : "No Passages Found"}
            </Text>
            <Text style={styles.emptyStateDesc}>
              {filterCategory === "Bookmarks"
                ? "Tap the bookmark icon on any passage card to save it to your personal practice list."
                : "Try looking under a different category or clear the filter."}
            </Text>
            {filterCategory === "Bookmarks" && (
              <Pressable style={styles.emptyStateButton} onPress={() => setFilterCategory("All")}>
                <Text style={styles.emptyStateButtonText}>Browse Passages</Text>
              </Pressable>
            )}
          </View>
        )}

        {__DEV__ && (
          <Pressable
            style={styles.devResetButton}
            onPress={async () => {
              await resetOnboarding();
              router.replace("/onboarding");
            }}
          >
            <Text style={styles.devResetText}>Reset onboarding (dev)</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border },
  greeting: { fontFamily: typography.sans, fontSize: typography.sizes.lg, color: colors.ink, fontWeight: "600" },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  sectionLabel: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  featuredSection: { marginTop: 12, marginBottom: 24 },
  exploreSectionHeader: { marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  filterScroll: { marginBottom: 16, marginHorizontal: -20 },
  filterScrollContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterPillText: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.ink, fontWeight: "600" },
  filterPillTextActive: { color: colors.surface },
  listContainer: { marginTop: 4 },
  emptyStateContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyStateTitle: { fontFamily: typography.serif, fontSize: 18, color: colors.ink, fontWeight: "700" },
  emptyStateDesc: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  emptyStateButton: {
    backgroundColor: colors.ink,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  emptyStateButtonText: { fontFamily: typography.sans, color: colors.surface, fontSize: typography.sizes.sm, fontWeight: "600" },
  devResetButton: { alignItems: "center", marginTop: 32, paddingVertical: 10 },
  devResetText: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkFaint, textDecorationLine: "underline" },
});