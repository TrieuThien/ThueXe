import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { useTheme } from "../../theme";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

export function OTPInput({ length = 6, value, onChange }: OTPInputProps) {
  const { theme } = useTheme();
  const refs = useRef<(TextInput | null)[]>([]);

  const otpValues = useMemo(() => Array.from({ length }, (_, index) => value[index] ?? ""), [length, value]);

  useEffect(() => {
    refs.current = refs.current.slice(0, length);
  }, [length]);

  return (
    <View style={styles.container}>
      {otpValues.map((char, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          value={char}
          keyboardType="number-pad"
          maxLength={1}
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
          onChangeText={(nextChar) => {
            const arr = value.split("").slice(0, length);
            arr[index] = nextChar;
            const nextValue = arr.join("").replace(/\s/g, "");
            onChange(nextValue);
            if (nextChar && index < length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  input: {
    width: 46,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },
});
