import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../common/AppButton';

export const ErrorState = ({
  title = 'Có lỗi xảy ra',
  description = 'Vui lòng thử lại.',
  onRetry
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {onRetry ? <AppButton title="Thử lại" onPress={onRetry} style={styles.button} /> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 18,
    gap: 10,
    backgroundColor: '#FEF2F2'
  },
  title: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '700'
  },
  description: {
    color: '#7F1D1D'
  },
  button: {
    marginTop: 6
  }
});
