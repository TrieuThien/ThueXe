import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from "react-native";

import { useTheme } from "../../theme";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function PrimaryButton({ title, onPress, disabled = false, loading = false, style, textStyle }: PrimaryButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled ? theme.colors.surfaceMuted : pressed ? theme.colors.primaryPressed : theme.colors.primary,
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Text style={[styles.text, { color: theme.colors.badgeText }, textStyle]}>{loading ? "Đang xử lý..." : title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});
