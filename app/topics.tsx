import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { PassageListItem } from "@/components/PassageListItem";
import { getTopicsByTrack } from "@/data/topics";
import { Topic } from "@/types";

function groupByCategory(topics: Topic[]): Map<string, Topic[]> {
  const map = new Map<string, Topic[]>();
  for (const topic of topics) {
    const list = map.get(topic.category) ?? [];
    list.push(topic);
    map.set(topic.category, list);
  }
  return map;
}

export default function TopicsScreen() {
  const router = useRouter();
  const enTopics = getTopicsByTrack("en");

  const readingTopics = useMemo(
    () => enTopics.filter((t) => t.contentType === "reading"),
    [enTopics]
  );
  const promptTopics = useMemo(
    () => enTopics.filter((t) => t.contentType === "prompt"),
    [enTopics]
  );
  const readingByCategory = useMemo(() => groupByCategory(readingTopics), [readingTopics]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>All Passages</Text>
        <Text style={styles.subtitle}>English · {enTopics.length} available</Text>

        {promptTopics.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Free Prompts</Text>
              <Text style={styles.sectionCount}>{promptTopics.length}</Text>
            </View>
            <Text style={styles.sectionHint}>
              Speak freely in your own words — scored on pace and fluency, not the content.
            </Text>
            <View style={styles.list}>
              {promptTopics.map((topic) => (
                <PassageListItem
                  key={topic.id}
                  topic={topic}
                  onPress={() => router.push(`/recording/${topic.id}`)}
                />
              ))}
            </View>
          </View>
        )}

        {Array.from(readingByCategory.entries()).map(([category, categoryTopics]) => (
          <View key={category} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>{category}</Text>
              <Text style={styles.sectionCount}>{categoryTopics.length}</Text>
            </View>
            <View style={styles.list}>
              {categoryTopics.map((topic) => (
                <PassageListItem
                  key={topic.id}
                  topic={topic}
                  onPress={() => router.push(`/recording/${topic.id}`)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  title: { fontFamily: typography.serif, fontSize: typography.sizes.xxl, color: colors.ink, fontWeight: "700" },
  subtitle: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 4, marginBottom: 20 },
  section: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionLabel: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.ink,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionCount: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted },
  sectionHint: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted, marginBottom: 12, lineHeight: 16 },
  list: { marginTop: 4 },
});
