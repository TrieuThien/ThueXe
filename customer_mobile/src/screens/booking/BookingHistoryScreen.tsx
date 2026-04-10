import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, BookingStatusBadge, EmptyState, ErrorState, LoadingState } from "../../components";
import { useRideBookingsQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";

type Props = NativeStackScreenProps<BookingStackParamList, "BookingHistory">;

export function BookingHistoryScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useRideBookingsQuery();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Lịch sử đặt xe" />
      <ScrollView contentContainerStyle={styles.container}>
        {isLoading ? <LoadingState /> : null}
        {isError ? <ErrorState onRetry={refetch} /> : null}
        {!isLoading && !isError && data?.length === 0 ? <EmptyState title="Chưa có chuyến xe" /> : null}

        {data?.map((booking) => (
          <Pressable
            key={booking.id}
            style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate("BookingDetail", { bookingId: booking.id })}
          >
            <View style={styles.row}>
              <Text style={[styles.route, { color: theme.colors.text }]} numberOfLines={1}>
                {`${booking.routeInfo.pickupAddress} -> ${booking.routeInfo.destinationAddress}`}
              </Text>
              <BookingStatusBadge status={booking.status} />
            </View>
            <Text style={[styles.price, { color: theme.colors.primary }]}>{formatCurrencyVND(booking.finalFare ?? booking.estimatedFare)}</Text>
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
  },
  item: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  row: {
    gap: 8,
  },
  route: {
    fontSize: 14,
    fontWeight: "600",
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
  },
});
