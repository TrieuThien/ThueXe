import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";

interface AppBadgeProps {
  text: string;
  tone?: "primary" | "success" | "warning" | "danger";
}

export function AppBadge({ text, tone = "primary" }: AppBadgeProps) {
  const { theme } = useTheme();

  const backgroundColor = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor }]}> 
      <Text style={[styles.text, { color: theme.colors.badgeText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
