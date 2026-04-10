import { StyleSheet, Text, View } from "react-native";

import { TripChatMessage } from "../../types";
import { useTheme } from "../../theme";
import { formatDateTimeVN } from "../../utils/format";

interface TripMessageBubbleProps {
  message: TripChatMessage;
}

export function TripMessageBubble({ message }: TripMessageBubbleProps) {
  const { theme } = useTheme();
  const isMine = message.senderRole === "CUSTOMER";

  const bubbleBackground = isMine ? theme.colors.primary : theme.colors.surface;
  const textColor = isMine ? theme.colors.badgeText : theme.colors.text;

  return (
    <View style={[styles.wrapper, isMine ? styles.mineWrap : styles.theirsWrap]}>
      <View style={[styles.bubble, { backgroundColor: bubbleBackground, borderColor: theme.colors.border }, !isMine && styles.theirsBubble]}>
        <Text style={[styles.content, { color: textColor }]}>{message.content}</Text>
        <Text style={[styles.meta, { color: isMine ? "#DBEAFE" : theme.colors.textMuted }]}>
          {formatDateTimeVN(message.createdAt)} - {message.deliveryStatus.toLowerCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 8,
  },
  mineWrap: {
    alignItems: "flex-end",
  },
  theirsWrap: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  theirsBubble: {
    borderWidth: 1,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    marginTop: 4,
    fontSize: 10,
  },
});
