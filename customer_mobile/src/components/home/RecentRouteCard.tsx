import { Pressable, StyleSheet, Text, View } from "react-native";

import { RecentRoute } from "../../types";
import { useTheme } from "../../theme";

interface RecentRouteCardProps {
  item: RecentRoute;
  onPress: (route: RecentRoute) => void;
}

export function RecentRouteCard({ item, onPress }: RecentRouteCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
      <View style={styles.content}>
        <Text style={[styles.pickup, { color: theme.colors.text }]} numberOfLines={1}>
          {item.pickupAddress}
        </Text>
        <Text style={[styles.destination, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {item.destinationAddress}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  pickup: {
    fontSize: 14,
    fontWeight: "600",
  },
  destination: {
    fontSize: 13,
  },
});
