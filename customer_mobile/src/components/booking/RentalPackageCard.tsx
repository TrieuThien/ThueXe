import { Pressable, StyleSheet, Text, View } from "react-native";

import { RentalPackageItem } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";

interface RentalPackageCardProps {
  item: RentalPackageItem;
  selected: boolean;
  onSelect: (packageId: string) => void;
}

export function RentalPackageCard({ item, selected, onSelect }: RentalPackageCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onSelect(item.packageId)}
      style={[
        styles.card,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: theme.colors.text }]}>{item.packageName}</Text>
        <Text style={[styles.price, { color: theme.colors.primary }]}>{formatCurrencyVND(item.totalEstimatedPrice)}</Text>
      </View>
      <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Còn {item.availableVehicles} xe/tài xế</Text>
      {item.vehicleTypeName ? <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Loại xe: {item.vehicleTypeName}</Text> : null}
      {item.driverLevel ? <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Tài xế: {item.driverLevel}</Text> : null}

      <View style={[styles.conditions, { borderColor: theme.colors.border }]}> 
        <Text style={[styles.cond, { color: theme.colors.textMuted }]}>Tiền cọc: {formatCurrencyVND(item.conditions.securityDeposit)}</Text>
        <Text style={[styles.cond, { color: theme.colors.textMuted }]}>Giới hạn: {item.conditions.distanceLimitKm} km</Text>
        <Text style={[styles.cond, { color: theme.colors.textMuted }]}>Quá giờ: {formatCurrencyVND(item.conditions.overtimeFeePerHour)}/giờ</Text>
        <Text style={[styles.cond, { color: theme.colors.textMuted }]}>Quá km: {formatCurrencyVND(item.conditions.overDistanceFeePerKm)}/km</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
  },
  meta: {
    fontSize: 13,
  },
  conditions: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 2,
  },
  cond: {
    fontSize: 12,
  },
});
