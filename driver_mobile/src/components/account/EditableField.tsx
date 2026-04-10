import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

type Props = {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  editable?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
  error?: string;
};

export const EditableField = ({
  label,
  value,
  onChangeText,
  editable = true,
  placeholder,
  keyboardType = 'default',
  error
}: Props) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor="#94A3B8"
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: error ? '#DC2626' : colors.border,
            backgroundColor: editable ? colors.card : '#E2E8F0'
          }
        ]}
      />
      {!editable ? <Text style={styles.locked}>Thông tin này không được phép chỉnh sửa</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  label: {
    fontSize: 13,
    fontWeight: '600'
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15
  },
  locked: {
    color: '#64748B',
    fontSize: 12
  },
  error: {
    color: '#B91C1C',
    fontSize: 12
  }
});
