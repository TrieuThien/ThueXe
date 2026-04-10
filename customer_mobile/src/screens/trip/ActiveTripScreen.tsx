import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { useActiveTripQuery, useCancelTripMutation, useHasDriver, useTripCancelPolicyQuery, useTripStatusUi } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "ActiveTrip">;

export function ActiveTripScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [cancelVisible, setCancelVisible] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | undefined>();
  const activeTripQuery = useActiveTripQuery();
  const activeTrip = activeTripQuery.data?.activeTrip ?? null;
  const bookingId = activeTrip?.bookingId;
  const cancelPolicyQuery = useTripCancelPolicyQuery(bookingId);
  const cancelTripMutation = useCancelTripMutation();

  const hasDriver = useHasDriver(activeTrip);
  const statusUi = useTripStatusUi(activeTrip?.status);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Chuyến hiện tại" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={activeTripQuery.isRefetching} onRefresh={activeTripQuery.refetch} />}
      >
        {activeTripQuery.isLoading ? <LoadingState message="Đang tải chuyến hiện tại..." /> : null}
        {activeTripQuery.isError ? <ErrorState description="Không tải được chuyến hiện tại" onRetry={activeTripQuery.refetch} /> : null}

        {!activeTripQuery.isLoading && !activeTripQuery.isError && !activeTrip ? (
          <EmptyState title="Bạn chưa có chuyến đang hoạt động" description="Đặt chuyến mới để bắt đầu đi chuyển." />
        ) : null}

        {activeTrip ? (
          <>
            <View style={styles.headerRow}>
              <TripStatusBadge status={activeTrip.status} />
              {activeTrip.etaMinutes ? (
                <Text style={[styles.etaText, { color: theme.colors.primary }]}>Ước tính: {activeTrip.etaMinutes} phút</Text>
              ) : null}
            </View>

            <TripStatusStepper steps={statusUi.steps} currentStepIndex={statusUi.currentStep} />
            <TripInfoCard trip={activeTrip} />

            {hasDriver && activeTrip.driver ? (
              <>
                <DriverInfoCard driver={activeTrip.driver} />
                <PrimaryButton
                  title="Theo dõi tài xế trên bản đồ"
                  onPress={() => navigation.navigate("DriverTrackingMap", { bookingId: activeTrip.bookingId })}
                />
                <PrimaryButton title="Chat với tài xế" onPress={() => navigation.navigate("TripChat", { bookingId: activeTrip.bookingId })} />
              </>
            ) : (
              <View style={[styles.searchingBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
                <Text style={[styles.searchingTitle, { color: theme.colors.text }]}>Đang tìm tài xế phù hợp...</Text>
                <Text style={[styles.searchingDesc, { color: theme.colors.textMuted }]}>Hệ thống sẽ cập nhật ngay khi có tài xế nhận chuyến.</Text>
              </View>
            )}

            <PrimaryButton title="Chi tiết chuyến" onPress={() => navigation.navigate("TripDetail", { bookingId: activeTrip.bookingId })} />
            <PrimaryButton
              title="Hủy chuyến"
              onPress={() => {
                setCancelVisible(true);
                setSelectedCancelReason(undefined);
                void cancelPolicyQuery.refetch();
              }}
            />
          </>
        ) : (
          <PrimaryButton title="Đặt chuyến mới" onPress={() => navigation.navigate("RideLocationPicker")} />
        )}
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
          if (!bookingId || !selectedCancelReason) {
            return;
          }

          await cancelTripMutation.mutateAsync({
            bookingId,
            reason: selectedCancelReason,
          });
          setCancelVisible(false);
          await activeTripQuery.refetch();
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  etaText: {
    fontSize: 14,
    fontWeight: "800",
  },
  searchingBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  searchingTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  searchingDesc: {
    fontSize: 13,
  },
});
