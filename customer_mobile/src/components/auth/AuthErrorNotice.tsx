import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";

interface AuthErrorNoticeProps {
  message?: string;
}

export function AuthErrorNotice({ message }: AuthErrorNoticeProps) {
  const { theme } = useTheme();

  if (!message) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.danger }]}>
      <Text style={[styles.message, { color: theme.colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});
