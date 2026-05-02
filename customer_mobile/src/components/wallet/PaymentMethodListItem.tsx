import { Pressable, StyleSheet, Text, View } from "react-native";

import { PaymentMethodOption } from "../../types";
import { useTheme } from "../../theme";

interface PaymentMethodListItemProps {
  item: PaymentMethodOption;
  selected?: boolean;
  onPress?: () => void;
}

const METHOD_META: Record<string, { label: string; bg: string; fg: string }> = {
  MOMO:      { label: "MoMo",   bg: "#FFE4EF", fg: "#B5004A" },
  SEPAY:     { label: "SePay",  bg: "#DBEAFE", fg: "#1D4ED8" },
  WALLET:    { label: "Ví",     bg: "#CCFBF1", fg: "#0F766E" },
  CASH:      { label: "Tiền",   bg: "#DCFCE7", fg: "#15803D" },
  BANK_CARD: { label: "Thẻ",   bg: "#FEF9C3", fg: "#A16207" },
  ZALOPAY:   { label: "Zalo",   bg: "#EEF2FF", fg: "#4338CA" },
};

export function PaymentMethodListItem({ item, selected = false, onPress }: PaymentMethodListItemProps) {
  const { theme } = useTheme();
  const meta = METHOD_META[item.type] ?? { label: item.type, bg: "#F1F5F9", fg: "#475569" };

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
        <View style={styles.left}>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        </View>
        {item.isDefault ? (
          <Text style={[styles.defaultTag, { color: theme.colors.primary }]}>Mặc định</Text>
        ) : null}
      </View>
      {item.subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{item.subtitle}</Text>
      ) : null}
      {item.linkedBankLabel ? (
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{item.linkedBankLabel}</Text>
      ) : null}
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
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  defaultTag: {
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginLeft: 44,
  },
});
