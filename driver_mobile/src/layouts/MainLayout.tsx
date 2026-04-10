import React, { type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ScreenContainer } from '../components/common';

type Props = PropsWithChildren<{
  title: string;
  scrollable?: boolean;
}>;

export const MainLayout = ({ title, children, scrollable = true }: Props) => {
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      {scrollable ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.contentNoScroll}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>
          {children}
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 12
  },
  contentNoScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 0,
    gap: 12
  },
  header: {
    paddingVertical: 2
  },
  title: {
    fontSize: 24,
    fontWeight: '800'
  }
});
