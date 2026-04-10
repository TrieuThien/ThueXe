import { StyleSheet, Text, View } from "react-native";

import { BookingPaymentSummary } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";
import { AppCard } from "../ui";

interface PaymentSummaryCardProps {
  summary: BookingPaymentSummary;
}

export function PaymentSummaryCard({ summary }: PaymentSummaryCardProps) {
  const { theme } = useTheme();

  const statusColor = {
    PENDING: theme.colors.warning,
    PAID: theme.colors.success,
    FAILED: theme.colors.danger,
    REFUNDED: theme.colors.secondary,
  }[summary.status];

  return (
    <AppCard>
      <Text style={[styles.title, { color: theme.colors.text }]}>Thông tin thanh toán</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Số tiền cần thanh toán</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{formatCurrencyVND(summary.payableAmount)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Số tiền đã thanh toán</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{formatCurrencyVND(summary.paidAmount)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Trạng thái</Text>
        <Text style={[styles.value, { color: statusColor }]}>{summary.status}</Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  label: {
    fontSize: 13,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
  },
});
