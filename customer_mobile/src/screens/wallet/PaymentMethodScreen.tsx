import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PaymentMethodListItem,
  PaymentSummaryCard,
  PrimaryButton,
} from "../../components";
import {
  useBookingPaymentSummaryQuery,
  usePayBookingMutation,
  usePaymentMethodsQuery,
  useRetryPaymentMutation,
  useSetDefaultPaymentMethodMutation,
} from "../../hooks";
import { WalletStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<WalletStackParamList, "PaymentMethod">;

export function PaymentMethodScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const [selectedMethodId, setSelectedMethodId] = useState<string | undefined>();
  const [latestPaymentId, setLatestPaymentId] = useState<string | undefined>();

  const methodsQuery = usePaymentMethodsQuery();
  const summaryQuery = useBookingPaymentSummaryQuery({
    bookingId: route.params?.bookingId,
    rentalBookingId: route.params?.rentalBookingId,
  });

  const payMutation = usePayBookingMutation();
  const retryMutation = useRetryPaymentMutation();
  const setDefaultMutation = useSetDefaultPaymentMethodMutation();

  const selectedResolvedMethodId = useMemo(() => {
    if (selectedMethodId) {
      return selectedMethodId;
    }
    return methodsQuery.data?.find((m) => m.isDefault)?.id ?? methodsQuery.data?.[0]?.id;
  }, [selectedMethodId, methodsQuery.data]);

  const selectedMethod = methodsQuery.data?.find((item) => item.id === selectedResolvedMethodId);

  const onPay = async () => {
    if (!selectedResolvedMethodId) {
      return;
    }

    try {
      const result = await payMutation.mutateAsync({
        bookingId: route.params?.bookingId,
        rentalBookingId: route.params?.rentalBookingId,
        paymentMethodId: selectedResolvedMethodId,
      });
      setLatestPaymentId(result.paymentId);
      await summaryQuery.refetch();
      Alert.alert("Thanh toán", result.status === "PAID" ? "Thanh toán thành công" : "Thanh toán thất bại");
    } catch {
      Alert.alert("Lỗi", "Thanh toán thất bại");
    }
  };

  const onRetry = async () => {
    if (!latestPaymentId) {
      return;
    }

    await retryMutation.mutateAsync({ paymentId: latestPaymentId });
    await summaryQuery.refetch();
  };

  const onSetDefaultMethod = async () => {
    if (!selectedResolvedMethodId || selectedMethod?.isDefault) {
      return;
    }

    try {
      await setDefaultMutation.mutateAsync({ paymentMethodId: selectedResolvedMethodId });
      await methodsQuery.refetch();
      Alert.alert("Phương thức thanh toán", "Đã cập nhật phương thức mặc định");
    } catch {
      Alert.alert("Lỗi", "Không thể đặt phương thức mặc định");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <AppHeader title="Phương thức thanh toán" />
      <ScrollView contentContainerStyle={styles.container}>
        {summaryQuery.isLoading ? <LoadingState message="Đang tải thông tin thanh toán..." /> : null}
        {summaryQuery.isError ? <ErrorState description="Không tải được thông tin thanh toán" onRetry={summaryQuery.refetch} /> : null}
        {summaryQuery.data ? <PaymentSummaryCard summary={summaryQuery.data} /> : null}

        {methodsQuery.isLoading ? <LoadingState message="Đang tải phương thức thanh toán..." /> : null}
        {methodsQuery.isError ? <ErrorState description="Không tải được phương thức thanh toán" onRetry={methodsQuery.refetch} /> : null}

        {!methodsQuery.isLoading && !methodsQuery.isError && methodsQuery.data?.length === 0 ? (
          <EmptyState title="Không có phương thức thanh toán" />
        ) : null}

        {methodsQuery.data?.map((item) => (
          <PaymentMethodListItem
            key={item.id}
            item={item}
            selected={selectedResolvedMethodId === item.id}
            onPress={() => setSelectedMethodId(item.id)}
          />
        ))}

        <PrimaryButton
          title="Đặt làm mặc định"
          onPress={onSetDefaultMethod}
          loading={setDefaultMutation.isPending}
          disabled={!selectedResolvedMethodId || !selectedMethod || selectedMethod.isDefault || !selectedMethod.isAvailable}
        />

        <PrimaryButton
          title="Thanh toán"
          onPress={onPay}
          loading={payMutation.isPending}
          disabled={summaryQuery.data?.status === "PAID"}
        />

        {summaryQuery.data?.status === "FAILED" ? (
          <PrimaryButton title="Thử lại thanh toán" onPress={onRetry} loading={retryMutation.isPending} />
        ) : null}

        <PrimaryButton title="Quay lại ví" onPress={() => navigation.goBack()} />
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
