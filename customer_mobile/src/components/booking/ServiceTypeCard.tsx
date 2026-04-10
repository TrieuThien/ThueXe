import { Pressable, StyleSheet, Text, View } from "react-native";

import { ServiceTypeOption } from "../../constants";
import { useTheme } from "../../theme";
import { AppCard } from "../ui";

interface ServiceTypeCardProps {
  item: ServiceTypeOption;
  isSelected: boolean;
  onPress: () => void;
}

export function ServiceTypeCard({ item, isSelected, onPress }: ServiceTypeCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <AppCard
        style={{
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          backgroundColor: isSelected ? theme.colors.surfaceMuted : theme.colors.surface,
        }}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{item.subtitle}</Text>
        </View>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
});
