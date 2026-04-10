import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { QuickDestination } from "../../types";
import { useTheme } from "../../theme";

interface QuickDestinationListProps {
  destinations: QuickDestination[];
  onPress: (item: QuickDestination) => void;
}

export function QuickDestinationList({ destinations, onPress }: QuickDestinationListProps) {
  const { theme } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
      {destinations.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onPress(item)}
          style={[styles.chip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.label, { color: theme.colors.text }]}>{item.label}</Text>
          <Text style={[styles.address, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {item.address}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    minWidth: 140,
    maxWidth: 190,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  address: {
    fontSize: 12,
  },
});
