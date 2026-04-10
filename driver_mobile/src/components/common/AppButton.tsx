import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export const AppButton = ({ title, onPress, disabled, loading, style }: Props) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary, opacity: disabled ? 0.5 : pressed ? 0.86 : 1 },
        style
      ]}
    >
      <Text style={styles.text}>{loading ? 'Đang xử lý...' : title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17
  }
});
