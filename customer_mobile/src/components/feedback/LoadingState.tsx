import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Đang tải dữ liệu..." }: LoadingStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={[styles.message, { color: theme.colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  message: {
    fontSize: 14,
  },
});
