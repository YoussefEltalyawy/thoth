import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { HighlightedWord } from "@/services/scoring";

export function TranscriptView({ words }: { words: HighlightedWord[] }) {
  return (
    <View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accentAmber }]} />
          <Text style={styles.legendLabel}>filler</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.inkFaint }]} />
          <Text style={styles.legendLabel}>pause</Text>
        </View>
      </View>

      <Text style={styles.paragraph}>
        {words.map((w, i) => (
          <Text key={i}>
            {w.pauseBefore !== "none" && <Text style={styles.pauseMarker}>{"  ·  "}</Text>}
            <Text style={w.isFiller ? styles.fillerWord : styles.plainWord}>{w.word}</Text>
            {" "}
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: "row", gap: 14, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 999 },
  legendLabel: { fontFamily: typography.sans, fontSize: typography.sizes.xs, color: colors.inkMuted },
  paragraph: { fontFamily: typography.serif, fontSize: typography.sizes.base, lineHeight: 26 },
  plainWord: { color: colors.ink },
  fillerWord: { color: colors.accentAmber, fontWeight: "600" },
  pauseMarker: { color: colors.inkFaint },
});
