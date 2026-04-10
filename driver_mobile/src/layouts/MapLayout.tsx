import React, { type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ScreenContainer } from '../components/common';

type Props = PropsWithChildren<{
  title: string;
}>;

export const MapLayout = ({ title, children }: Props) => {
  const { colors } = useTheme();

  return (
    <ScreenContainer style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapLabel}>Bản đồ trực tuyến (mock)</Text>
      </View>
      <View style={[styles.panel, { backgroundColor: colors.card }]}> 
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {children}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  mapPlaceholder: {
    flex: 1,
    margin: 12,
    borderRadius: 18,
    backgroundColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  mapLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B'
  },
  panel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22
  },
  title: {
    fontSize: 20,
    fontWeight: '800'
  }
});
