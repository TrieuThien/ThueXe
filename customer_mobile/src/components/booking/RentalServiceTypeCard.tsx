import { Pressable, StyleSheet, Text } from "react-native";

import { RentalServiceOption } from "../../types";
import { useTheme } from "../../theme";

interface RentalServiceTypeCardProps {
  option: RentalServiceOption;
  selected: boolean;
  onPress: (id: RentalServiceOption["id"]) => void;
}

export function RentalServiceTypeCard({ option, selected, onPress }: RentalServiceTypeCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(option.id)}
      style={[
        styles.card,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          backgroundColor: selected ? theme.colors.surfaceMuted : theme.colors.surface,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>{option.title}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{option.subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
  },
});
