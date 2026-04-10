import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";

interface AuthLinkRowProps {
  label: string;
  actionLabel: string;
  onPress: () => void;
}

export function AuthLinkRow({ label, actionLabel, onPress }: AuthLinkRowProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Pressable onPress={onPress}>
        <Text style={[styles.link, { color: theme.colors.primary }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
  },
});
