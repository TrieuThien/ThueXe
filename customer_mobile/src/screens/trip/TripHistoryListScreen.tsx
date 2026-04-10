import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, EmptyState, ErrorState, LoadingState, TripStatusBadge } from "../../components";
import { useTripHistoryQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";
import { formatCurrencyVND, formatDateTimeVN } from "../../utils/format";

type Props = NativeStackScreenProps<BookingStackParamList, "TripHistoryList">;

export function TripHistoryListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const historyQuery = useTripHistoryQuery();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Lịch sử chuyến" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={historyQuery.isRefetching} onRefresh={historyQuery.refetch} />}
      >
        {historyQuery.isLoading ? <LoadingState message="Đang tải lịch sử..." /> : null}
        {historyQuery.isError ? <ErrorState description="Không tải được lịch sử chuyến" onRetry={historyQuery.refetch} /> : null}
        {!historyQuery.isLoading && !historyQuery.isError && historyQuery.data?.items.length === 0 ? (
          <EmptyState title="Chưa có lịch sử chuyến" />
        ) : null}

        {historyQuery.data?.items.map((item) => (
          <Pressable
            key={item.bookingId}
            style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate("TripHistoryDetail", { bookingId: item.bookingId })}
          >
            <Text style={[styles.service, { color: theme.colors.text }]}>{item.serviceLabel}</Text>
            <Text style={[styles.route, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {item.route.pickupAddress}
              {" đến "}
              {item.route.destinationAddress}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textMuted }]}>{formatDateTimeVN(item.createdAt)}</Text>
            <Text style={[styles.price, { color: theme.colors.primary }]}>
              {formatCurrencyVND(item.priceInfo.finalPrice ?? item.priceInfo.estimatedPrice)}
            </Text>
            <TripStatusBadge status={item.status} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 10,
    paddingBottom: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  service: {
    fontSize: 15,
    fontWeight: "800",
  },
  route: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
  },
});
