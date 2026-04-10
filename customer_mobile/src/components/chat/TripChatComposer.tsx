import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../../theme";

interface TripChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
  disabledReason?: string;
}

export function TripChatComposer({
  value,
  onChangeText,
  onSend,
  disabled = false,
  sending = false,
  disabledReason,
}: TripChatComposerProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
      {disabled && disabledReason ? <Text style={[styles.disabledReason, { color: theme.colors.warning }]}>{disabledReason}</Text> : null}
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled && !sending}
          placeholder={disabled ? "Không thể gửi tin nhắn" : "Nhập tin nhắn..."}
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <Pressable
          onPress={onSend}
          disabled={disabled || sending || !value.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
              opacity: disabled || sending || !value.trim() ? 0.5 : 1,
            },
          ]}
        >
          <Text style={styles.sendText}>{sending ? "..." : "Gửi"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    padding: 10,
    gap: 8,
  },
  disabledReason: {
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    height: 44,
    minWidth: 58,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  sendText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
