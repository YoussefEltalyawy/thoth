import { Stack } from "expo-router";
import { colors } from "@/theme/colors";

export default function RootLayout() {
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
