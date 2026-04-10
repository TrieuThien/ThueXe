import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";
import { AppCard } from "../ui";

interface PriceSummaryCardProps {
  baseFare: number;
  distanceFee: number;
  serviceFee: number;
  discount?: number;
}

export function PriceSummaryCard({ baseFare, distanceFee, serviceFee, discount = 0 }: PriceSummaryCardProps) {
  const { theme } = useTheme();

  const total = baseFare + distanceFee + serviceFee - discount;

  return (
    <AppCard>
      <Text style={[styles.title, { color: theme.colors.text }]}>Tóm tắt giá</Text>
      <Row label="Giá mở cửa" value={formatCurrencyVND(baseFare)} />
      <Row label="Phí quãng đường" value={formatCurrencyVND(distanceFee)} />
      <Row label="Phí dịch vụ" value={formatCurrencyVND(serviceFee)} />
      {discount > 0 ? <Row label="Giảm giá" value={`-${formatCurrencyVND(discount)}`} isDiscount /> : null}
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <Row label="Tổng" value={formatCurrencyVND(total)} isTotal />
    </AppCard>
  );
}

function Row({
  label,
  value,
  isTotal = false,
  isDiscount = false,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
  isDiscount?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.textMuted }, isTotal && styles.totalText]}>{label}</Text>
      <Text style={[styles.value, { color: isDiscount ? theme.colors.success : theme.colors.text }, isTotal && styles.totalText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
});
