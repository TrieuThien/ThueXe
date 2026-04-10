import { StyleSheet, Text, View } from "react-native";

import { WalletLedgerEntry } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND, formatDateTimeVN } from "../../utils/format";

interface WalletTransactionItemProps {
  item: WalletLedgerEntry;
}

export function WalletTransactionItem({ item }: WalletTransactionItemProps) {
  const { theme } = useTheme();
  const incoming = item.direction === "IN";

  const statusColor = {
    PENDING: theme.colors.warning,
    PAID: theme.colors.success,
    FAILED: theme.colors.danger,
    REFUNDED: theme.colors.secondary,
  }[item.status];

  return (
    <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
      <View style={styles.row}>
        <Text style={[styles.desc, { color: theme.colors.text }]}>{item.description}</Text>
        <Text style={[styles.amount, { color: incoming ? theme.colors.success : theme.colors.danger }]}>
          {incoming ? "+" : "-"}
          {formatCurrencyVND(item.amount)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{formatDateTimeVN(item.createdAt)}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{item.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  desc: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  amount: {
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    fontSize: 12,
  },
  status: {
    fontSize: 12,
    fontWeight: "700",
  },
});
