import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, DriverInfoCard, EmptyState, ErrorState, LoadingState, TripInfoCard, TripStatusBadge, TripStatusStepper } from "../../components";
import { useTripDetailQuery, useTripStatusUi } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "TripHistoryDetail">;

export function TripHistoryDetailScreen({ route }: Props) {
  const { theme } = useTheme();
  const detailQuery = useTripDetailQuery(route.params.bookingId);
  const trip = detailQuery.data;
  const statusUi = useTripStatusUi(trip?.status);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Chi tiết lịch sử" />
      <ScrollView contentContainerStyle={styles.container}>
        {detailQuery.isLoading ? <LoadingState /> : null}
        {detailQuery.isError ? <ErrorState description="Không tải được chi tiết chuyến" onRetry={detailQuery.refetch} /> : null}
        {!detailQuery.isLoading && !detailQuery.isError && !trip ? <EmptyState title="Không tìm thấy chuyến" /> : null}

        {trip ? (
          <>
            <TripStatusBadge status={trip.status} />
            <TripStatusStepper steps={statusUi.steps} currentStepIndex={statusUi.currentStep} />
            <TripInfoCard trip={trip} />
            {trip.driver ? <DriverInfoCard driver={trip.driver} /> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
});
