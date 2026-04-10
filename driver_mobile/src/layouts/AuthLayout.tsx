import React, { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ScreenContainer } from '../components/common';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export const AuthLayout = ({ title, subtitle, children }: Props) => {
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: colors.text, opacity: 0.75 }]}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 24,
    gap: 20
  },
  header: {
    gap: 8
  },
  title: {
    fontSize: 30,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 15
  }
});
