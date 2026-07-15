import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { completeOnboarding } from "@/services/storage";

const CATEGORIES = ["Philosophy", "Ethics", "Psychology", "Discipline", "Human Nature", "Science"];

type Step = "profile" | "topics";

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggleCategory(category: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function handleFinish() {
    setSaving(true);
    await completeOnboarding(name.trim(), avatarUri, Array.from(selected));
    router.replace("/");
  }

  if (step === "profile") {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <Text style={styles.eyebrow}>Welcome to Thoth</Text>
            <Text style={styles.title}>Let's set up your profile</Text>
            <Text style={styles.subtitle}>Just the basics — this is only for you.</Text>

            <Pressable style={styles.avatarPicker} onPress={pickAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera-outline" size={24} color={colors.inkMuted} />
                </View>
              )}
              <Text style={styles.avatarLabel}>{avatarUri ? "Change photo" : "Add a photo"}</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>What should we call you?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.continueButton, name.trim().length === 0 && styles.continueButtonDisabled]}
              disabled={name.trim().length === 0}
              onPress={() => setStep("topics")}
            >
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Pressable onPress={() => setStep("profile")} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={colors.inkMuted} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>Hi {name.trim() || "there"}</Text>
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
                onPress={() => toggleCategory(category)}
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
          onPress={handleFinish}
        >
          <Text style={styles.continueText}>{saving ? "Saving…" : "Start practicing"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, justifyContent: "space-between" },
  flex: { flex: 1, justifyContent: "space-between" },
  content: { padding: 24, paddingTop: 40 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  backText: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted },
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
  avatarPicker: { alignItems: "center", marginTop: 32 },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 10 },
  fieldLabel: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.ink, fontWeight: "600", marginTop: 32 },
  input: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.lg,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    marginTop: 10,
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
