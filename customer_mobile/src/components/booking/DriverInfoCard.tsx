import { Image, StyleSheet, Text, View } from "react-native";

import { DriverProfile } from "../../types";
import { useTheme } from "../../theme";
import { AppCard } from "../ui";

interface DriverInfoCardProps {
  driver: DriverProfile;
}

export function DriverInfoCard({ driver }: DriverInfoCardProps) {
  const { theme } = useTheme();

  return (
    <AppCard>
      <View style={styles.row}>
        <Image
          source={{
            uri:
              driver.avatarUrl ||
              "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=128&h=128&fit=crop",
          }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{driver.fullName}</Text>
          <Text style={[styles.detail, { color: theme.colors.textMuted }]}>Đánh giá: {driver.rating.toFixed(1)} sao</Text>
          {driver.vehicleName ? <Text style={[styles.detail, { color: theme.colors.textMuted }]}>{driver.vehicleName}</Text> : null}
          {driver.licensePlate ? (
            <Text style={[styles.detail, { color: theme.colors.textMuted }]}>Biển số: {driver.licensePlate}</Text>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  detail: {
    fontSize: 13,
  },
});
