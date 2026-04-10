import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";

export function HomeSectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
});
