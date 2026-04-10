import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../theme";

interface AppHeaderProps {
  title: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

export function AppHeader({ title, leftAction, rightAction }: AppHeaderProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.background }}>
      <View style={[styles.container, { borderBottomColor: theme.colors.border }]}> 
        <View style={styles.side}>{leftAction}</View>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.right]}>{rightAction}</View>
      </View>
    </SafeAreaView>
  );
}

export function HeaderTextButton({ label, onPress }: { label: React.ReactNode; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Text style={[styles.actionText, { color: theme.colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  side: {
    width: 72,
  },
  right: {
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
