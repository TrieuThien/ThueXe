import { StyleSheet, Text } from "react-native";

import { ManagedTrip } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";
import { AppCard } from "../ui";

interface TripInfoCardProps {
  trip: ManagedTrip;
}

export function TripInfoCard({ trip }: TripInfoCardProps) {
  const { theme } = useTheme();

  return (
    <AppCard>
      <Text style={[styles.title, { color: theme.colors.text }]}>{trip.serviceLabel}</Text>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>Điểm đón: {trip.route.pickupAddress}</Text>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>Điểm đến: {trip.route.destinationAddress}</Text>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>Loại chuyến: {trip.kind === "RIDE" ? "Đi chuyển" : "Thuê"}</Text>
      <Text style={[styles.line, { color: theme.colors.textMuted }]}>Thanh toán: {trip.priceInfo.paymentMethod}</Text>
      <Text style={[styles.price, { color: theme.colors.primary }]}>Giá: {formatCurrencyVND(trip.priceInfo.finalPrice ?? trip.priceInfo.estimatedPrice)}</Text>
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
  price: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "800",
  },
});
