import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, DriverInfoCard, PriceSummaryCard } from "../../components";
import { useRideBookingsQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "BookingDetail">;

export function BookingDetailScreen({ route }: Props) {
  const { theme } = useTheme();
  const { data } = useRideBookingsQuery();

  const booking = data?.find((item) => item.id === route.params.bookingId) ?? data?.[0];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Chi tiết chuyến xe" />
      <View style={styles.container}>
        {!booking ? <Text style={{ color: theme.colors.textMuted }}>Không tìm thấy thông tin</Text> : null}
        {booking?.driver ? <DriverInfoCard driver={booking.driver} /> : null}
        {booking ? (
          <PriceSummaryCard
            baseFare={30000}
            distanceFee={booking.routeInfo.distanceKm * 5000}
            serviceFee={5000}
            discount={0}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 12,
  },
});
