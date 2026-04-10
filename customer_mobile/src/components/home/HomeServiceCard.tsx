import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RideType } from "../../types";
import { useTheme } from "../../theme";

interface HomeServiceCardProps {
  title: string;
  subtitle?: string;
  rideType: RideType;
  onPress: (rideType: RideType) => void;
  variant?: "default" | "grid";
}

const accentMap: Record<RideType, string> = {
  CALL_RIDE: "#E0F2FE",
  RENTAL_CAR: "#E0F2FE",
  RENTAL_DRIVER: "#E0F2FE",
};

const iconMap: Record<RideType, keyof typeof Ionicons.glyphMap> = {
  CALL_RIDE: "car-sport-outline",
  RENTAL_CAR: "car-outline",
  RENTAL_DRIVER: "person-outline",
};

export function HomeServiceCard({ title, subtitle, rideType, onPress, variant = "default" }: HomeServiceCardProps) {
  const { theme } = useTheme();
  const isGrid = variant === "grid";

  return (
    <Pressable onPress={() => onPress(rideType)} style={isGrid ? styles.gridPressable : undefined}>
      <View
        style={[
          styles.container,
          isGrid ? styles.gridContainer : undefined,
          { borderColor: theme.colors.border, backgroundColor: accentMap[rideType] },
        ]}
      >
        {isGrid ? <Ionicons name={iconMap[rideType]} size={26} color="#0F172A" /> : null}
        <Text style={[styles.title, isGrid ? styles.gridTitle : undefined, { color: "#0F172A" }]}>{title}</Text>
        {!isGrid && subtitle ? <Text style={[styles.subtitle, { color: "#334155" }]}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridPressable: {
    height: "100%",
  },
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 5,
    minHeight: 90,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  gridContainer: {
    minHeight: 110,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  gridTitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
