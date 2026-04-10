import React, { type PropsWithChildren } from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export const ScreenContainer = ({ children, style }: Props) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }, style]}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
