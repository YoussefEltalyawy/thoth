import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { PassageListItem } from "@/components/PassageListItem";
import { getTopicsByTrack } from "@/data/topics";

export default function TopicsScreen() {
  const router = useRouter();
  const enTopics = getTopicsByTrack("en");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>All Passages</Text>
        <Text style={styles.subtitle}>English · {enTopics.length} available</Text>

        <View style={styles.list}>
          {enTopics.map((topic) => (
            <PassageListItem
              key={topic.id}
              topic={topic}
              onPress={() => router.push(`/recording/${topic.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  title: { fontFamily: typography.serif, fontSize: typography.sizes.xxl, color: colors.ink, fontWeight: "700" },
  subtitle: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 4, marginBottom: 20 },
  list: { marginTop: 4 },
});
