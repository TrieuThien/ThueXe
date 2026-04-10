import { Pressable, StyleSheet, Text, View } from "react-native";

import { RideVehicleOption } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";

interface RideVehicleOptionCardProps {
  option: RideVehicleOption;
  selected: boolean;
  onSelect: (vehicleCode: string) => void;
}

export function RideVehicleOptionCard({ option, selected, onSelect }: RideVehicleOptionCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onSelect(option.vehicleCode)}
      style={[
        styles.card,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.surfaceMuted : theme.colors.surface,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.name, { color: theme.colors.text }]}>{option.displayName}</Text>
        <Text style={[styles.price, { color: theme.colors.primary }]}>Tu {formatCurrencyVND(option.baseFare)}</Text>
      </View>
      <Text style={[styles.desc, { color: theme.colors.textMuted }]}>{option.description}</Text>
      <Text style={[styles.meta, { color: theme.colors.textMuted }]}>
        {option.seats} chỗ - Đón {option.etaPickupMinutes} phút
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
  },
  desc: {
    fontSize: 13,
  },
  meta: {
    fontSize: 12,
  },
});
