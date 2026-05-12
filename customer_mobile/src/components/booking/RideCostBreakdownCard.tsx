import { StyleSheet, Text, View } from "react-native";

import { RidePricingBreakdown } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";
import { AppCard } from "../ui";

interface RideCostBreakdownCardProps {
  breakdown: RidePricingBreakdown;
}

function Row({ label, value, isEmphasize = false, color }: { label: string; value: string; isEmphasize?: boolean; color?: string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.textMuted }, isEmphasize && styles.emphasize]}>{label}</Text>
      <Text style={[styles.value, { color: color ?? theme.colors.text }, isEmphasize && styles.emphasize]}>{value}</Text>
    </View>
  );
}

export function RideCostBreakdownCard({ breakdown }: RideCostBreakdownCardProps) {
  const { theme } = useTheme();

  return (
    <AppCard>
      <Text style={[styles.title, { color: theme.colors.text }]}>Tóm tắt chi phí</Text>
      <Row label="Giá ước tính" value={formatCurrencyVND(breakdown.estimatedFare)} />
      <Row label="Phí dịch vụ" value={formatCurrencyVND(breakdown.serviceFee + breakdown.distanceFee + breakdown.bookingFee)} />
      <Row label="Phụ phí" value={formatCurrencyVND(breakdown.surcharge)} />
      <Row label="Giảm giá" value={`-${formatCurrencyVND(breakdown.discount)}`} color={theme.colors.success} />
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <Row label="Tổng thanh toán" value={formatCurrencyVND(breakdown.totalPayable)} isEmphasize />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  emphasize: {
    fontSize: 16,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
});
