import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
};

export const AuthTextLink = ({ label, onPress }: Props) => (
  <Pressable onPress={onPress} hitSlop={6}>
    <Text style={styles.link}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  link: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center'
  }
});
