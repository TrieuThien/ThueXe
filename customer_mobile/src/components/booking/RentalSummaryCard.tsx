import { StyleSheet, Text, View } from "react-native";

import { RentalPackageItem, RentalPricingResponse, RentalSearchCriteria } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";
import { AppCard } from "../ui";

interface RentalSummaryCardProps {
  criteria: RentalSearchCriteria;
  selectedPackage: RentalPackageItem;
  pricing?: RentalPricingResponse;
}

export function RentalSummaryCard({ criteria, selectedPackage, pricing }: RentalSummaryCardProps) {
  const { theme } = useTheme();

  return (
    <AppCard>
      <Text style={[styles.title, { color: theme.colors.text }]}>Tóm tắt thuê</Text>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>Gói: {selectedPackage.packageName}</Text>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>Bắt đầu: {new Date(criteria.startAt).toLocaleString("vi-VN")}</Text>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>Thời lượng: {criteria.durationHours} giờ</Text>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>Điểm đón: {criteria.pickupAddress}</Text>
      {criteria.dropoffAddress ? <Text style={[styles.line, { color: theme.colors.textMuted }]}>Điểm trả: {criteria.dropoffAddress}</Text> : null}

      {pricing ? (
        <View style={[styles.pricingWrap, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Giá gói: {formatCurrencyVND(pricing.basePrice)}</Text>
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Phí thời lượng: {formatCurrencyVND(pricing.durationFee)}</Text>
          <Text style={[styles.line, { color: theme.colors.textMuted }]}>Phí dịch vụ: {formatCurrencyVND(pricing.serviceFee)}</Text>
          <Text style={[styles.line, { color: theme.colors.success }]}>Giảm giá: -{formatCurrencyVND(pricing.discount)}</Text>
          <Text style={[styles.total, { color: theme.colors.text }]}>Tổng tạm tính: {formatCurrencyVND(pricing.totalPayableNow)}</Text>
          <Text style={[styles.deposit, { color: theme.colors.warning }]}>Tiền cọc: {formatCurrencyVND(pricing.deposit)}</Text>
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  line: {
    fontSize: 13,
    marginBottom: 4,
  },
  pricingWrap: {
    marginTop: 8,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  total: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "800",
  },
  deposit: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
  },
});
