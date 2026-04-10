import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: theme.colors.textMuted }]}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    textAlign: "center",
    fontSize: 14,
  },
});
