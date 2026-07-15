import React, { useCallback, useState } from "react";
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
import { getStreak, getOnboardingPrefs, resetOnboarding } from "@/services/storage";
import { StreakState } from "@/types";

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
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (checkingOnboarding) {
    return <SafeAreaView style={styles.safe} />;
  }

  // Personalize by onboarding selections: featured topic and list both
  // prioritize categories the person actually picked, without hiding
  // the rest entirely.
  const preferredTopics =
    selectedCategories.length > 0
      ? topics.filter((t) => selectedCategories.includes(t.category))
      : topics;
  const orderedTopics = [
    ...preferredTopics,
    ...topics.filter((t) => !preferredTopics.includes(t)),
  ];

  const featuredTopic = orderedTopics[0];
  const explorePassages = orderedTopics.slice(1);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
          <Pressable style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Today's Reading</Text>
        <TodayReadingCard
          topic={featuredTopic}
          imageUrl={`https://picsum.photos/seed/${featuredTopic.id}/600/400`}
          onStart={() => router.push(`/recording/${featuredTopic.id}`)}
        />

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

        <Text style={styles.sectionLabel}>Explore Passages</Text>
        <View>
          {explorePassages.map((topic) => (
            <PassageListItem
              key={topic.id}
              topic={topic}
              onPress={() => router.push(`/recording/${topic.id}`)}
            />
          ))}
        </View>

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
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  greeting: { fontFamily: typography.sans, fontSize: typography.sizes.lg, color: colors.ink, fontWeight: "600" },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  statsRow: { flexDirection: "row", gap: 12, marginVertical: 20 },
  devResetButton: { alignItems: "center", marginTop: 24, paddingVertical: 10 },
  devResetText: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkFaint, textDecorationLine: "underline" },
});