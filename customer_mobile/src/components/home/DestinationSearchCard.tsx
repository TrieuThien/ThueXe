import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";

interface DestinationSearchCardProps {
  currentAddress: string;
  onPressSearch: () => void;
  isLocating?: boolean;
  locationError?: string | null;
  onRefreshLocation?: () => void;
}

export function DestinationSearchCard({
  currentAddress,
  onPressSearch,
  isLocating = false,
  locationError = null,
  onRefreshLocation,
}: DestinationSearchCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.caption, { color: theme.colors.textMuted }]}>Vị trí hiện tại</Text>
      <Text style={[styles.address, { color: theme.colors.text }]} numberOfLines={1}>
        {isLocating ? "Đang lấy vị trí..." : currentAddress}
      </Text>
      {locationError ? <Text style={[styles.errorText, { color: theme.colors.warning }]}>{locationError}</Text> : null}

      <Pressable onPress={onPressSearch} style={[styles.searchBox, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Text style={[styles.searchText, { color: theme.colors.textMuted }]}>Bạn muốn đi đâu?</Text>
      </Pressable>

      {onRefreshLocation ? (
        <Pressable onPress={onRefreshLocation}>
          <Text style={[styles.refreshText, { color: theme.colors.primary }]}>Cập nhật vị trí hiện tại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  caption: {
    fontSize: 12,
    fontWeight: "600",
  },
  address: {
    fontSize: 15,
    fontWeight: "700",
  },
  searchBox: {
    borderRadius: 12,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 4,
  },
  searchText: {
    fontSize: 14,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
    alignSelf: "flex-start",
  },
  errorText: {
    fontSize: 12,
  },
});
