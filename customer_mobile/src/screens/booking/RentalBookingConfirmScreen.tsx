import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, AuthErrorNotice, CouponSuggestionList, PrimaryButton, RentalSummaryCard, TextField } from "../../components";
import { getRentalFlowErrorMessage, useCreateRentalBookingMutation, usePayRentalDepositMutation, useRentalPricingQuery, useRideCouponsQuery, useWalletOverviewQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalBookingConfirm">;

export function RentalBookingConfirmScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const criteria = useRentalFlowStore((state) => state.criteria);
  const selectedPackage = useRentalFlowStore((state) => state.selectedPackage);
  const couponCode = useRentalFlowStore((state) => state.couponCode);
  const note = useRentalFlowStore((state) => state.note);
  const setExtraInfo = useRentalFlowStore((state) => state.setExtraInfo);
  const setPricing = useRentalFlowStore((state) => state.setPricing);
  const buildCreatePayload = useRentalFlowStore((state) => state.buildCreatePayload);

  const [couponInput, setCouponInput] = useState(couponCode ?? "");
  const couponsQuery = useRideCouponsQuery();
  const safeCoupons = Array.isArray(couponsQuery.data) ? couponsQuery.data : [];

  const createMutation = useCreateRentalBookingMutation();
  const depositMutation = usePayRentalDepositMutation();
  const walletQuery = useWalletOverviewQuery();

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

  const depositAmount = pricingQuery.data?.deposit ?? selectedPackage?.conditions?.securityDeposit ?? 0;
  const walletBalance = walletQuery.data?.balance ?? 0;
  const hasEnoughBalance = walletBalance >= depositAmount;

  const onConfirm = async () => {
    const payload = buildCreatePayload();
    if (!payload) return;

    if (depositAmount > 0 && !hasEnoughBalance) {
      Alert.alert(
        "Số dư không đủ",
        `Số dư ví hiện tại (${formatCurrencyVND(walletBalance)}) không đủ để thanh toán tiền cọc ${formatCurrencyVND(depositAmount)}. Bạn có muốn nạp tiền vào ví?`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Nạp tiền",
            onPress: () => {
              // Navigate to Wallet tab → TopUpWallet
              (navigation.getParent() as any)?.navigate("Wallet", { screen: "TopUpWallet" });
            },
          },
        ],
      );
      return;
    }

    try {
      // Step 1: Create the booking
      const result = await createMutation.mutateAsync(payload);
      const bookingId = result.bookingId;

      // Step 2: Pay deposit immediately
      if (depositAmount > 0) {
        try {
          await depositMutation.mutateAsync(bookingId);
        } catch (depositErr: unknown) {
          // Deposit failed after booking creation – redirect to success but note error
          const errCode = (depositErr as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
          if (errCode === "INSUFFICIENT_WALLET_BALANCE") {
            Alert.alert(
              "Đặt xe thành công nhưng chưa thanh toán cọc",
              `Số dư ví không đủ để thanh toán tiền cọc ${formatCurrencyVND(depositAmount)}. Vui lòng nạp thêm tiền và thanh toán cọc để hoàn tất.`,
              [
                {
                  text: "Nạp tiền ngay",
                  onPress: () => {
                    navigation.replace("RentalBookingSuccess", {
                      bookingId,
                      status: result.bookingStatus,
                      message: result.message,
                    });
                    (navigation.getParent() as any)?.navigate("Wallet", { screen: "TopUpWallet" });
                  },
                },
                {
                  text: "Để sau",
                  onPress: () => navigation.replace("RentalBookingSuccess", { bookingId, status: result.bookingStatus, message: result.message }),
                },
              ],
            );
            return;
          }
          throw depositErr;
        }
      }

      navigation.replace("RentalBookingSuccess", {
        bookingId,
        status: result.bookingStatus,
        message: result.message,
      });
    } catch {
      // errors displayed below
    }
  };

  const isPending = createMutation.isPending || depositMutation.isPending;

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

        {/* Deposit payment notice */}
        {depositAmount > 0 ? (
          <View style={[styles.depositNotice, { backgroundColor: theme.colors.warning + "22", borderColor: theme.colors.warning }]}>
            <Text style={[styles.depositTitle, { color: theme.colors.warning }]}>Thanh toán tiền cọc bắt buộc</Text>
            <Text style={[styles.depositText, { color: theme.colors.text }]}>
              Khi xác nhận, hệ thống sẽ tự động trừ{" "}
              <Text style={{ fontWeight: "800" }}>{formatCurrencyVND(depositAmount)}</Text> tiền cọc từ Ví ThueXe của bạn.
            </Text>
            <View style={styles.balanceRow}>
              <Text style={[styles.depositText, { color: theme.colors.textMuted }]}>Số dư ví hiện tại:</Text>
              <Text style={[styles.depositText, { color: hasEnoughBalance ? theme.colors.success : theme.colors.danger, fontWeight: "700" }]}>
                {" "}{formatCurrencyVND(walletBalance)}
              </Text>
            </View>
            {!hasEnoughBalance ? (
              <Text style={[styles.depositText, { color: theme.colors.danger, marginTop: 4 }]}>
                ⚠ Số dư không đủ. Vui lòng nạp thêm tiền trước khi đặt xe.
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Coupon</Text>
        <TextField
          value={couponInput}
          onChangeText={setCouponInput}
          placeholder="Nhập mã coupon"
        />
        <PrimaryButton
          title="Áp dụng coupon"
          onPress={() => setExtraInfo(couponInput.trim() || undefined, note)}
          style={styles.applyButton}
        />
        {safeCoupons.length > 0 ? (
          <CouponSuggestionList
            coupons={safeCoupons}
            onSelectCoupon={(code) => {
              setCouponInput(code);
              setExtraInfo(code, note);
            }}
          />
        ) : null}

        {pricingQuery.error ? <AuthErrorNotice message={getRentalFlowErrorMessage(pricingQuery.error)} /> : null}
        {createMutation.error ? <AuthErrorNotice message={getRentalFlowErrorMessage(createMutation.error)} /> : null}
        {depositMutation.error ? <AuthErrorNotice message={getRentalFlowErrorMessage(depositMutation.error)} /> : null}

        <PrimaryButton
          title={depositAmount > 0 ? `Đặt xe & Thanh toán cọc ${formatCurrencyVND(depositAmount)}` : "Tạo yêu cầu thuê"}
          onPress={onConfirm}
          loading={isPending}
        />
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
  depositNotice: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  depositTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  depositText: {
    fontSize: 13,
    lineHeight: 18,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
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
