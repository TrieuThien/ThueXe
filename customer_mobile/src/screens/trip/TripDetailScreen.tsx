import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppHeader,
  CancelTripModal,
  DriverInfoCard,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  TripInfoCard,
  TripStatusBadge,
  TripStatusStepper,
} from "../../components";
import { useCancelTripMutation, useTripCancelPolicyQuery, useTripDetailQuery, useTripStatusUi } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";
import { formatDateTimeVN } from "../../utils/format";

type Props = NativeStackScreenProps<BookingStackParamList, "TripDetail">;

export function TripDetailScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const [cancelVisible, setCancelVisible] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | undefined>();
  const detailQuery = useTripDetailQuery(route.params.bookingId);
  const trip = detailQuery.data;
  const statusUi = useTripStatusUi(trip?.status);
  const cancelPolicyQuery = useTripCancelPolicyQuery(route.params.bookingId);
  const cancelTripMutation = useCancelTripMutation();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Chi tiết chuyến" />
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

            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Tạo lúc: {formatDateTimeVN(trip.createdAt)}</Text>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Cập nhật: {formatDateTimeVN(trip.updatedAt)}</Text>
            {trip.startedAt ? <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Bắt đầu: {formatDateTimeVN(trip.startedAt)}</Text> : null}
            {trip.completedAt ? <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Hoàn thành: {formatDateTimeVN(trip.completedAt)}</Text> : null}
            {trip.driver ? <PrimaryButton title="Chat với tài xế" onPress={() => navigation.navigate("TripChat", { bookingId: trip.bookingId })} /> : null}
            <PrimaryButton
              title="Hủy chuyến"
              onPress={() => {
                setCancelVisible(true);
                setSelectedCancelReason(undefined);
                void cancelPolicyQuery.refetch();
              }}
            />
          </>
        ) : null}
      </ScrollView>

      <CancelTripModal
        visible={cancelVisible}
        reasons={cancelPolicyQuery.data?.reasons ?? []}
        selectedReason={selectedCancelReason}
        canCancel={cancelPolicyQuery.data?.canCancel ?? false}
        warningText={cancelPolicyQuery.data?.warningText}
        estimatedCancellationFee={cancelPolicyQuery.data?.estimatedCancellationFee}
        disabledReason={cancelPolicyQuery.data?.disabledReason}
        loading={cancelTripMutation.isPending}
        onSelectReason={setSelectedCancelReason}
        onClose={() => setCancelVisible(false)}
        onConfirm={async () => {
          if (!selectedCancelReason) {
            return;
          }

          await cancelTripMutation.mutateAsync({
            bookingId: route.params.bookingId,
            reason: selectedCancelReason,
          });
          setCancelVisible(false);
          await detailQuery.refetch();
        }}
      />
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
  meta: {
    fontSize: 12,
  },
});
