import { Stack } from "expo-router";
import { colors } from "@/theme/colors";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import Constants from "expo-constants";

// Expo Go can't reliably load large local font assets over a tunnel connection.
// We detect it and skip font loading — the app uses system serif as fallback.
const isExpoGo = Constants.appOwnership === "expo";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(
    isExpoGo
      ? {} // Skip font loading in Expo Go
      : { BpmfZihiKaiStd: require("../assets/fonts/BpmfZihiKaiStd.ttf") }
  );

  // Only block on loading if we actually tried to load fonts and haven't finished
  const ready = isExpoGo || fontsLoaded || !!fontError;

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="topics" />
      <Stack.Screen name="recording/[topicId]" />
      <Stack.Screen name="results/[sessionId]" />
      <Stack.Screen name="progress" />
    </Stack>
  );
}
