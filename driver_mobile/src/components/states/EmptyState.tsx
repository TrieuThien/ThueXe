import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 18,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC'
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B'
  },
  description: {
    textAlign: 'center',
    color: '#64748B'
  }
});
