import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";
import { PrimaryButton } from "../common";

interface ErrorStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Có lỗi xảy ra",
  description = "Vui lòng thử lại sau.",
  actionLabel = "Thử lại",
  onRetry,
}: ErrorStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.danger }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.colors.textMuted }]}>{description}</Text>
      {onRetry ? <PrimaryButton title={actionLabel} onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  description: {
    textAlign: "center",
    fontSize: 14,
  },
});
