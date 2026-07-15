import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { completeOnboarding } from "@/services/storage";

const CATEGORIES = ["Philosophy", "Ethics", "Psychology", "Discipline", "Human Nature", "Science"];

export default function OnboardingScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggle(category: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }

  async function handleContinue() {
    setSaving(true);
    await completeOnboarding(Array.from(selected));
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Welcome to Thoth</Text>
        <Text style={styles.title}>What do you want to speak about?</Text>
        <Text style={styles.subtitle}>
          Pick a few topics you actually enjoy. Thoth pulls passages and prompts from these
          each day.
        </Text>

        <View style={styles.chipsWrap}>
          {CATEGORIES.map((category) => {
            const active = selected.has(category);
            return (
              <Pressable
                key={category}
                onPress={() => toggle(category)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{category}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, (selected.size === 0 || saving) && styles.continueButtonDisabled]}
          disabled={selected.size === 0 || saving}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>{saving ? "Saving…" : "Continue"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, justifyContent: "space-between" },
  content: { padding: 24, paddingTop: 40 },
  eyebrow: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.accentOlive,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.xxl,
    color: colors.ink,
    fontWeight: "700",
    marginTop: 10,
  },
  subtitle: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.base,
    color: colors.inkMuted,
    marginTop: 10,
    lineHeight: 22,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 28 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.ink, fontWeight: "600" },
  chipTextActive: { color: colors.surface },
  footer: { padding: 24 },
  continueButton: { backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 18, alignItems: "center" },
  continueButtonDisabled: { opacity: 0.35 },
  continueText: { fontFamily: typography.sans, color: colors.surface, fontSize: typography.sizes.base, fontWeight: "600" },
});
