import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppHeader, HeaderTextButton } from "../../components";
import { useCreateVehicleBookingMutation, usePayRentalDepositMutation, useRentalPricingQuery, useWalletOverviewQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalVehicleConfirm">;

type PaymentMethod = "wallet" | "cash";
const PAYMENT_TYPE_NUM: Record<PaymentMethod, number> = { wallet: 1, cash: 2 };

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function formatDatetime(iso: string) {
  try {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function computeEndDatetime(startIso: string, durationHours: number) {
  try {
    const d = new Date(new Date(startIso).getTime() + durationHours * 3_600_000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return "—";
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {children}
    </View>
  );
}

function CardLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[styles.cardLabel, { color: theme.colors.textMuted }]}>
      {label.toUpperCase()}
    </Text>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text
        style={[styles.infoValue, { color: accent ? (theme.colors.primary ?? "#2563eb") : theme.colors.text }]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const { theme } = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function RentalVehicleConfirmScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { car, packageId, packageName, packageBasePrice, packageDurationHours } = route.params;
  const criteria = useRentalFlowStore((s) => s.criteria);

  // Thời lượng của gói thuê ưu tiên hơn thời lượng người dùng nhập
  const durationHours = packageDurationHours ?? criteria?.durationHours ?? 0;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wallet");
  const mutation = useCreateVehicleBookingMutation();
  const depositMutation = usePayRentalDepositMutation();
  const walletQuery = useWalletOverviewQuery();
  const pricingQuery = useRentalPricingQuery(
    criteria
      ? { packageId: String(packageId), criteria: { ...criteria, durationHours } }
      : undefined,
  );

  const depositAmount = pricingQuery.data?.deposit ?? 0;
  const walletBalance = walletQuery.data?.balance ?? 0;
  const hasEnoughBalance = walletBalance >= depositAmount;

  const vehicleName = [car.brand, car.model, car.year].filter(Boolean).join(" ") || "Xe không tên";
  const startDisplay = criteria?.startAt ? formatDatetime(criteria.startAt) : "—";
  const endDisplay =
    criteria?.startAt && durationHours
      ? computeEndDatetime(criteria.startAt, durationHours)
      : "—";

  async function handleSubmit() {
    if (!criteria) {
      Alert.alert("Thiếu thông tin", "Vui lòng quay lại và nhập đầy đủ thông tin đặt xe.");
      return;
    }

    if (depositAmount > 0 && !hasEnoughBalance) {
      Alert.alert(
        "Số dư không đủ",
        `Số dư ví hiện tại (${formatVnd(walletBalance)}) không đủ để thanh toán tiền cọc ${formatVnd(depositAmount)}. Bạn có muốn nạp tiền vào ví?`,
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

    try {
      const result = await mutation.mutateAsync({
        service_type: 1,
        package_id: packageId,
        vehicle_id: car.vehicle_id,
        start_datetime: criteria.startAt,
        duration_hours: durationHours,
        pickup_address: criteria.pickupAddress,
        dropoff_address: criteria.dropoffAddress,
        payment_type: PAYMENT_TYPE_NUM[paymentMethod],
      });

      const rentalId = String(result.booking.rental_id);
      const bookingStatus = result.booking.status === "scheduled" ? "SCHEDULED" : "PENDING";

      if (depositAmount > 0) {
        try {
          await depositMutation.mutateAsync(rentalId);
        } catch (depositErr: unknown) {
          const errCode = (depositErr as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
          if (errCode === "INSUFFICIENT_WALLET_BALANCE") {
            Alert.alert(
              "Đặt xe thành công nhưng chưa thanh toán cọc",
              `Số dư ví không đủ để thanh toán tiền cọc ${formatVnd(depositAmount)}. Vui lòng nạp thêm tiền và thanh toán cọc để hoàn tất.`,
              [
                {
                  text: "Nạp tiền ngay",
                  onPress: () => {
                    navigation.replace("RentalBookingSuccess", {
                      bookingId: rentalId,
                      status: bookingStatus,
                      message: "Yêu cầu đã gửi. Vui lòng thanh toán tiền cọc để hoàn tất đặt xe.",
                    });
                    (navigation.getParent() as any)?.navigate("Wallet", { screen: "TopUpWallet" });
                  },
                },
                {
                  text: "Để sau",
                  onPress: () => navigation.replace("RentalBookingSuccess", {
                    bookingId: rentalId,
                    status: bookingStatus,
                    message: "Yêu cầu đã gửi nhưng chưa thanh toán tiền cọc.",
                  }),
                },
              ],
            );
            return;
          }
          throw depositErr;
        }
      }

      navigation.replace("RentalBookingSuccess", {
        bookingId: rentalId,
        status: bookingStatus,
        message: "Yêu cầu của bạn đã được gửi đến chủ xe qua email. Chủ xe sẽ xác nhận trong thời gian sớm nhất.",
      });
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Đặt xe thất bại. Vui lòng thử lại.";
      Alert.alert("Đặt xe thất bại", msg);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Xác nhận đặt xe" leftAction={<HeaderTextButton label="Quay lại" onPress={() => navigation.goBack()} />} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Thông tin xe ─────────────────────────────────────────────────── */}
        <SectionCard>
          <CardLabel label="Thông tin xe" />
          <InfoRow label="Xe" value={vehicleName} />
          <InfoRow label="Biển số" value={car.license_plate} />
          {car.type_name ? <InfoRow label="Loại xe" value={car.type_name} /> : null}
          <InfoRow label="Gói thuê" value={packageName} accent />
        </SectionCard>

        {/* ── Thời gian & Địa điểm ─────────────────────────────────────────── */}
        <SectionCard>
          <CardLabel label="Thời gian & Địa điểm" />
          <InfoRow label="Bắt đầu" value={startDisplay} />
          <InfoRow label="Kết thúc (dự kiến)" value={endDisplay} />
          <InfoRow label="Thời lượng" value={`${durationHours} giờ`} />
          {criteria?.pickupAddress ? <InfoRow label="Điểm đón" value={criteria.pickupAddress} /> : null}
          {criteria?.dropoffAddress ? <InfoRow label="Điểm trả" value={criteria.dropoffAddress} /> : null}
        </SectionCard>

        {/* ── Chi phí ──────────────────────────────────────────────────────── */}
        {(packageBasePrice !== undefined && packageBasePrice > 0) || depositAmount > 0 ? (
          <SectionCard>
            <CardLabel label="Chi phí tham khảo" />
            {packageBasePrice !== undefined && packageBasePrice > 0 ? (
              <InfoRow label="Giá cơ bản" value={formatVnd(packageBasePrice)} />
            ) : null}
            {pricingQuery.isLoading ? (
              <InfoRow label="Tiền đặt cọc" value="Đang tải..." />
            ) : depositAmount > 0 ? (
              <InfoRow label="Tiền đặt cọc" value={formatVnd(depositAmount)} accent />
            ) : null}
            <Divider />
            <Text style={[styles.priceNote, { color: theme.colors.textMuted }]}>
              Giá cuối sẽ được xác nhận dựa trên quãng đường và thời gian thực tế.
            </Text>
          </SectionCard>
        ) : null}

        {/* ── Phương thức thanh toán ────────────────────────────────────────── */}
        <SectionCard>
          <CardLabel label="Phương thức thanh toán" />
          <View style={styles.paymentRow}>
            <PaymentOption
              icon="👛"
              label="Ví ThueXe"
              selected={paymentMethod === "wallet"}
              onPress={() => setPaymentMethod("wallet")}
            />
            <PaymentOption
              icon="💵"
              label="Tiền mặt"
              selected={paymentMethod === "cash"}
              onPress={() => setPaymentMethod("cash")}
            />
          </View>
        </SectionCard>

        {/* ── Thông báo tiền cọc ──────────────────────────────────────────── */}
        {depositAmount > 0 ? (
          <View
            style={[
              styles.notice,
              {
                backgroundColor: (theme.colors.warning ?? "#f59e0b") + "14",
                borderColor: (theme.colors.warning ?? "#f59e0b") + "40",
              },
            ]}
          >
            <Text style={styles.noticeIcon}>⚠️</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.noticeTitle, { color: theme.colors.warning ?? "#f59e0b" }]}>
                Bắt buộc thanh toán tiền cọc
              </Text>
              <Text style={[styles.noticeText, { color: theme.colors.text }]}>
                Khi xác nhận, hệ thống sẽ tự động trừ{" "}
                <Text style={{ fontWeight: "800" }}>{formatVnd(depositAmount)}</Text> tiền cọc từ Ví ThueXe của bạn.
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.noticeText, { color: theme.colors.textMuted }]}>Số dư ví:</Text>
                <Text
                  style={[
                    styles.noticeText,
                    {
                      color: hasEnoughBalance ? (theme.colors.success ?? "#10b981") : (theme.colors.danger ?? "#ef4444"),
                      fontWeight: "700",
                    },
                  ]}
                >
                  {" "}{formatVnd(walletBalance)}
                </Text>
              </View>
              {!hasEnoughBalance ? (
                <Text style={[styles.noticeText, { color: theme.colors.danger ?? "#ef4444" }]}>
                  ⚠ Số dư không đủ. Vui lòng nạp thêm tiền trước khi đặt xe.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Nút gửi ─────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: theme.colors.primary ?? "#2563eb" },
            (mutation.isPending || depositMutation.isPending) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={mutation.isPending || depositMutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending || depositMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {depositAmount > 0
                ? `Đặt xe & Thanh toán cọc ${formatVnd(depositAmount)}`
                : "Gửi yêu cầu đặt xe"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Payment Option ─────────────────────────────────────────────────────────────

function PaymentOption({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const primary = theme.colors.primary ?? "#2563eb";
  return (
    <TouchableOpacity
      style={[
        styles.paymentOption,
        { borderColor: selected ? primary : theme.colors.border },
        selected && { backgroundColor: primary + "12" },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.paymentIcon}>{icon}</Text>
      <Text style={[styles.paymentLabel, { color: selected ? primary : theme.colors.text }]}>
        {label}
      </Text>
      {selected ? (
        <View style={[styles.selectedDot, { backgroundColor: primary }]} />
      ) : null}
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 16 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: -2,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: "600", flex: 2, textAlign: "right" },

  divider: { height: 1, marginVertical: 2 },
  priceNote: { fontSize: 12, fontStyle: "italic" },

  paymentRow: { flexDirection: "row", gap: 10 },
  paymentOption: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  paymentIcon: { fontSize: 26 },
  paymentLabel: { fontSize: 13, fontWeight: "700" },
  selectedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  notice: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  noticeIcon: { fontSize: 18, lineHeight: 22 },
  noticeTitle: { fontSize: 13, fontWeight: "800" as const, marginBottom: 2 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },

  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
