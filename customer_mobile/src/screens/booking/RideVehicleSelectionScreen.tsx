import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppHeader,
  AuthErrorNotice,
  CouponSuggestionList,
  EmptyState,
  ErrorState,
  LoadingState,
  PaymentMethodSelector,
  PrimaryButton,
  RideCostBreakdownCard,
  RideVehicleOptionCard,
  RouteSummaryCard,
  TextField,
} from "../../components";
import {
  getRideFlowErrorMessage,
  useRideCouponsQuery,
  useRidePaymentMethodsQuery,
  useRidePricingQuery,
  useRideVehicleOptionsQuery,
} from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRideFlowStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "RideVehicleSelection">;

export function RideVehicleSelectionScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const routeEstimate = useRideFlowStore((state) => state.routeEstimate);
  const selectedVehicleCode = useRideFlowStore((state) => state.selectedVehicleCode);
  const paymentMethodId = useRideFlowStore((state) => state.paymentMethodId);
  const couponCode = useRideFlowStore((state) => state.couponCode);
  const setVehicleSelection = useRideFlowStore((state) => state.setVehicleSelection);
  const setCouponCode = useRideFlowStore((state) => state.setCouponCode);
  const setPricingEstimate = useRideFlowStore((state) => state.setPricingEstimate);
  const scheduledAt = useRideFlowStore((state) => state.scheduledAt);

  const [couponInput, setCouponInput] = useState(couponCode ?? "");

  const vehiclesQuery = useRideVehicleOptionsQuery(routeEstimate?.routeId);
  const paymentsQuery = useRidePaymentMethodsQuery();
  const couponsQuery = useRideCouponsQuery();

  useEffect(() => {
    if (!selectedVehicleCode && vehiclesQuery.data?.[0] && !paymentMethodId && paymentsQuery.data?.[0]) {
      setVehicleSelection({
        vehicleCode: vehiclesQuery.data[0].vehicleCode,
        paymentMethodId: paymentsQuery.data[0].id,
      });
    }
  }, [selectedVehicleCode, paymentMethodId, vehiclesQuery.data, paymentsQuery.data, setVehicleSelection]);

  const pricingPayload = useMemo(() => {
    if (!routeEstimate?.routeId || !selectedVehicleCode || !paymentMethodId) {
      return undefined;
    }

    return {
      routeId: routeEstimate.routeId,
      vehicleCode: selectedVehicleCode,
      paymentMethodId,
      couponCode: couponCode || undefined,
      scheduledAt,
    };
  }, [routeEstimate?.routeId, selectedVehicleCode, paymentMethodId, couponCode, scheduledAt]);

  const pricingQuery = useRidePricingQuery(pricingPayload);

  useEffect(() => {
    if (pricingQuery.data) {
      setPricingEstimate(pricingQuery.data);
    }
  }, [pricingQuery.data, setPricingEstimate]);

  if (!routeEstimate) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Chọn xe" />
        <EmptyState title="Thiếu lộ trình" description="Vui lòng quay lại nhập điểm đón/điểm đến." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Chọn xe và thanh toán" />
      <ScrollView contentContainerStyle={styles.container}>
        <RouteSummaryCard route={routeEstimate} />

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Loại xe</Text>
        {vehiclesQuery.isLoading ? <LoadingState message="Đang tải danh sách xe..." /> : null}
        {vehiclesQuery.isError ? <ErrorState description="Lỗi khi tải loại xe" onRetry={vehiclesQuery.refetch} /> : null}
        {vehiclesQuery.data?.map((item) => (
          <RideVehicleOptionCard
            key={item.vehicleCode}
            option={item}
            selected={selectedVehicleCode === item.vehicleCode}
            onSelect={(vehicleCode) =>
              setVehicleSelection({
                vehicleCode,
                paymentMethodId: paymentMethodId ?? paymentsQuery.data?.[0]?.id ?? "cash",
              })
            }
          />
        ))}

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Phương thức thanh toán</Text>
        {paymentsQuery.isLoading ? <LoadingState message="Đang tải phương thức thanh toán..." /> : null}
        {paymentsQuery.data ? (
          <PaymentMethodSelector
            methods={paymentsQuery.data}
            selectedId={paymentMethodId}
            onSelect={(nextPaymentId) =>
              setVehicleSelection({
                vehicleCode: selectedVehicleCode ?? vehiclesQuery.data?.[0]?.vehicleCode ?? "CAR_4",
                paymentMethodId: nextPaymentId,
              })
            }
          />
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Coupon</Text>
        <TextField value={couponInput} onChangeText={setCouponInput} placeholder="Nhập mã coupon" />
        <PrimaryButton
          title="Áp dụng coupon"
          onPress={() => setCouponCode(couponInput.trim() || undefined)}
          style={styles.applyButton}
        />
        {couponsQuery.data ? <CouponSuggestionList coupons={couponsQuery.data} onSelectCoupon={setCouponCode} /> : null}

        {pricingQuery.isLoading ? <LoadingState message="Đang cập nhật giá cước..." /> : null}
        {pricingQuery.isError ? <AuthErrorNotice message={getRideFlowErrorMessage(pricingQuery.error)} /> : null}
        {pricingQuery.data ? <RideCostBreakdownCard breakdown={pricingQuery.data.breakdown} /> : null}

        <PrimaryButton
          title="Xác nhận thông tin"
          onPress={() => navigation.navigate("RideBookingConfirm")}
          disabled={!pricingQuery.data}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 10,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  applyButton: {
    marginTop: -2,
  },
});
