import { Pressable, StyleSheet, Text, View } from "react-native";

import { PaymentMethodOption } from "../../types";
import { useTheme } from "../../theme";

interface PaymentMethodListItemProps {
  item: PaymentMethodOption;
  selected?: boolean;
  onPress?: () => void;
}

export function PaymentMethodListItem({ item, selected = false, onPress }: PaymentMethodListItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: theme.colors.surface,
          opacity: item.isAvailable ? 1 : 0.55,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        {item.isDefault ? <Text style={[styles.defaultTag, { color: theme.colors.primary }]}>Mặc định</Text> : null}
      </View>
      {item.subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{item.subtitle}</Text> : null}
      {item.linkedBankLabel ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{item.linkedBankLabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  defaultTag: {
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
  },
});
