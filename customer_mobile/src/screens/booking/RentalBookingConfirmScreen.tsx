import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, AuthErrorNotice, PrimaryButton, RentalSummaryCard } from "../../components";
import { getRentalFlowErrorMessage, useCreateRentalBookingMutation, useRentalPricingQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalBookingConfirm">;

export function RentalBookingConfirmScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const criteria = useRentalFlowStore((state) => state.criteria);
  const selectedPackage = useRentalFlowStore((state) => state.selectedPackage);
  const couponCode = useRentalFlowStore((state) => state.couponCode);
  const note = useRentalFlowStore((state) => state.note);
  const setPricing = useRentalFlowStore((state) => state.setPricing);
  const buildCreatePayload = useRentalFlowStore((state) => state.buildCreatePayload);

  const createMutation = useCreateRentalBookingMutation();

  const pricingQuery = useRentalPricingQuery(
    criteria && selectedPackage
      ? {
          packageId: selectedPackage.packageId,
          criteria,
          couponCode,
          note,
        }
      : undefined,
  );

  useEffect(() => {
    if (pricingQuery.data) {
      setPricing(pricingQuery.data);
    }
  }, [pricingQuery.data, setPricing]);

  const onConfirm = async () => {
    const payload = buildCreatePayload();
    if (!payload) {
      return;
    }

    try {
      const result = await createMutation.mutateAsync(payload);
      navigation.replace("RentalBookingSuccess", {
        bookingId: result.bookingId,
        status: result.bookingStatus,
        message: result.message,
      });
    } catch {
      // handled by ui below
    }
  };

  if (!criteria || !selectedPackage) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Xác nhận thuê" />
        <AuthErrorNotice message="Thiếu thông tin đặt thuê. Vui lòng chọn lại gói." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Xác nhận yêu cầu thuê" />
      <ScrollView contentContainerStyle={styles.container}>
        <RentalSummaryCard criteria={criteria} selectedPackage={selectedPackage} pricing={pricingQuery.data} />

        {pricingQuery.error ? <AuthErrorNotice message={getRentalFlowErrorMessage(pricingQuery.error)} /> : null}
        {createMutation.error ? <AuthErrorNotice message={getRentalFlowErrorMessage(createMutation.error)} /> : null}

        <PrimaryButton title="Tạo yêu cầu thuê" onPress={onConfirm} loading={createMutation.isPending} />
        <PrimaryButton title="Sửa gói thuê" onPress={() => navigation.navigate("RentalPackageList")} />
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
