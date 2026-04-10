import { StyleSheet, Text, View } from "react-native";

import { RideRouteEstimateResponse } from "../../types";
import { useTheme } from "../../theme";
import { AppCard } from "../ui";

interface RouteSummaryCardProps {
  route: RideRouteEstimateResponse;
}

export function RouteSummaryCard({ route }: RouteSummaryCardProps) {
  const { theme } = useTheme();

  return (
    <AppCard>
      <View style={styles.item}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Điểm đón</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{route.pickup.address}</Text>
      </View>
      {route.stops.map((stop, index) => (
        <View key={index} style={styles.item}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{`Điểm dừng ${index + 1}`}</Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>{stop.address}</Text>
        </View>
      ))}
      <View style={styles.item}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Điểm đến</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{route.destination.address}</Text>
      </View>
      <Text style={[styles.meta, { color: theme.colors.primary }]}>
        {route.distanceKm.toFixed(1)} km - ETA {route.etaMinutes} phút
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  item: {
    marginBottom: 8,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
  },
});
