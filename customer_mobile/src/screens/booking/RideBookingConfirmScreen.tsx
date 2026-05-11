import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppHeader,
  AuthErrorNotice,
  PrimaryButton,
  RideCostBreakdownCard,
  RouteSummaryCard,
  TextField,
} from "../../components";
import { getRideFlowErrorMessage, useCreateRideBookingMutation } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { ApiError } from "../../services";
import { useRideFlowStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "RideBookingConfirm">;

export function RideBookingConfirmScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const createBookingMutation = useCreateRideBookingMutation();

  const routeEstimate = useRideFlowStore((state) => state.routeEstimate);
  const pricingEstimate = useRideFlowStore((state) => state.pricingEstimate);
  const isScheduled = useRideFlowStore((state) => state.isScheduled);
  const scheduledAt = useRideFlowStore((state) => state.scheduledAt);
  const setNote = useRideFlowStore((state) => state.setNote);
  const buildPayload = useRideFlowStore((state) => state.buildCreateBookingPayload);

  const [note, setLocalNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const onConfirmBooking = async () => {
    setErrorMessage(undefined);
    setNote(note);

    const payload = buildPayload();
    if (!payload) {
      setErrorMessage("Thiếu thông tin đặt xe. Vui lòng kiểm tra lại.");
      return;
    }

    try {
      const response = await createBookingMutation.mutateAsync(payload);

      if (response.bookingStatus === "SCHEDULED") {
        Alert.alert("Đặt lịch thành công", "Chuyến xe hẹn giờ đã được tạo.", [
          {
            text: "Xem lịch sử",
            onPress: () => navigation.navigate("DriverHireHistory"),
          },
        ]);
        return;
      }

      navigation.replace("RideSearchingDriver", { bookingId: response.bookingId });
    } catch (error) {
      if (error instanceof ApiError && error.code === "INSUFFICIENT_WALLET_BALANCE") {
        Alert.alert(
          "Số dư không đủ",
          "Số dư ví ThueXe không đủ để đặt xe. Vui lòng nạp thêm tiền vào ví.",
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Nạp tiền",
              onPress: () => (navigation.getParent() as any)?.navigate("Wallet", { screen: "TopUpWallet" }),
            },
          ],
        );
        return;
      }
      setErrorMessage(getRideFlowErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Xác nhận đặt xe" />
      <ScrollView contentContainerStyle={styles.container}>
        {routeEstimate ? <RouteSummaryCard route={routeEstimate} /> : null}
        {pricingEstimate ? <RideCostBreakdownCard breakdown={pricingEstimate.breakdown} /> : null}
        <TextField
          label="Ghi chú cho tài xế (tùy chọn)"
          value={note}
          onChangeText={setLocalNote}
          placeholder="Ví dụ: Gọi cho tôi khi đến"
        />

        <AuthErrorNotice message={errorMessage} />

        <PrimaryButton
          title={isScheduled ? "Đặt lịch chuyến xe" : "Đặt xe ngay"}
          onPress={onConfirmBooking}
          loading={createBookingMutation.isPending}
        />

        <PrimaryButton
          title={isScheduled ? `Hẹn giờ: ${scheduledAt ?? "--"}` : "Khởi hành ngay"}
          onPress={() => {}}
          disabled
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
    gap: 12,
    paddingBottom: 28,
  },
});
