import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { completeOnboarding } from "@/services/storage";

const CATEGORIES = ["Philosophy", "Ethics", "Psychology", "Discipline", "Human Nature", "Science"];

type Step = "welcome" | "profile" | "topics";

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
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
    // Dismiss the keyboard first to prevent layout transitions from canceling the picker
    Keyboard.dismiss();
    
    // Check and request permission
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission to access media library is required to choose a profile picture.");
      return;
    }

    // A small timeout ensures the keyboard has fully dismissed and layout is stable
    setTimeout(async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], // Use non-deprecated API parameter
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
          setAvatarUri(result.assets[0].uri);
        }
      } catch (error) {
        console.error("Error picking avatar:", error);
      }
    }, 150);
  }

  async function handleFinish() {
    setSaving(true);
    await completeOnboarding(name.trim(), avatarUri, Array.from(selected));
    router.replace("/");
  }

  if (step === "welcome") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeHero}>
            <View style={styles.iconContainer}>
              <Ionicons name="mic-outline" size={48} color={colors.accentOlive} />
            </View>
            <Text style={styles.eyebrow}>Introducing Thoth</Text>
            <Text style={styles.welcomeTitle}>Speak with clarity, rhythm, & confidence</Text>
            <Text style={styles.welcomeSubtitle}>
              Your personal reading and voice coach. Learn to master your pace, reduce filler words, and speak with poise.
            </Text>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="chatbubbles-outline" size={22} color={colors.accentOlive} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Real-time Read Along</Text>
                <Text style={styles.featureDesc}>
                  Words in the passage highlight word-by-word in sync with your speech as you read them out loud.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="analytics-outline" size={22} color={colors.accentOlive} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Speech Analytics</Text>
                <Text style={styles.featureDesc}>
                  Track your average pace (WPM), catch filler words, and note unnatural pauses or hesitations.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="flame-outline" size={22} color={colors.accentAmber} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Daily Streaks</Text>
                <Text style={styles.featureDesc}>
                  Build consistency and reading habits by completing just one two-minute passage each day.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.continueButton} onPress={() => setStep("profile")}>
            <Text style={styles.continueText}>Get Started</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "profile") {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => setStep("welcome")} style={styles.backRow}>
              <Ionicons name="chevron-back" size={18} color={colors.inkMuted} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <Text style={styles.eyebrow}>Step 1 of 2</Text>
            <Text style={styles.title}>Who is speaking?</Text>
            <Text style={styles.subtitle}>Let's set up your local profile. Your voice data and metrics never leave your device.</Text>

            <Pressable style={styles.avatarPicker} onPress={pickAvatar}>
              {avatarUri ? (
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  <View style={styles.avatarCameraBadge}>
                    <Ionicons name="camera" size={16} color={colors.surface} />
                  </View>
                </View>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.inkMuted} />
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
              onSubmitEditing={() => {
                if (name.trim().length > 0) {
                  setStep("topics");
                }
              }}
            />
          </ScrollView>

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
      <View style={styles.flex}>
        <View style={styles.content}>
          <Pressable onPress={() => setStep("profile")} style={styles.backRow}>
            <Ionicons name="chevron-back" size={18} color={colors.inkMuted} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.eyebrow}>Step 2 of 2</Text>
          <Text style={styles.title}>What do you want to read?</Text>
          <Text style={styles.subtitle}>
            Select the categories you're interested in. Thoth will personalize your daily readings to match your interests.
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
            <Text style={styles.continueText}>{saving ? "Saving…" : "Start Practice"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, justifyContent: "space-between" },
  scrollContent: { padding: 24, paddingTop: 20, paddingBottom: 40 },
  content: { padding: 24, paddingTop: 20 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16, alignSelf: "flex-start" },
  backText: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted },
  welcomeHero: { alignItems: "center", textAlign: "center", marginTop: 24, marginBottom: 32 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  eyebrow: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.sm,
    color: colors.accentOlive,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  welcomeTitle: {
    fontFamily: typography.serif,
    fontSize: 28,
    color: colors.ink,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 36,
  },
  welcomeSubtitle: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.base,
    color: colors.inkMuted,
    marginTop: 12,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  featuresList: { gap: 24, paddingHorizontal: 8, marginBottom: 12 },
  featureItem: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontFamily: typography.sans, fontSize: typography.sizes.base, color: colors.ink, fontWeight: "600" },
  featureDesc: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.inkMuted, marginTop: 4, lineHeight: 18 },
  title: {
    fontFamily: typography.serif,
    fontSize: typography.sizes.xxl,
    color: colors.ink,
    fontWeight: "700",
    marginTop: 8,
  },
  subtitle: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.base,
    color: colors.inkMuted,
    marginTop: 8,
    lineHeight: 22,
  },
  avatarPicker: { alignItems: "center", marginTop: 24 },
  avatarWrapper: { position: "relative" },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.accentOlive,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
  },
  avatarLabel: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.accentOlive, fontWeight: "600", marginTop: 12 },
  fieldLabel: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.ink, fontWeight: "600", marginTop: 32 },
  input: {
    fontFamily: typography.sans,
    fontSize: typography.sizes.lg,
    color: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    marginTop: 8,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 24 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: typography.sans, fontSize: typography.sizes.sm, color: colors.ink, fontWeight: "600" },
  chipTextActive: { color: colors.surface },
  footer: { padding: 24, backgroundColor: colors.background },
  continueButton: { backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  continueButtonDisabled: { opacity: 0.35 },
  continueText: { fontFamily: typography.sans, color: colors.surface, fontSize: typography.sizes.base, fontWeight: "600" },
});
