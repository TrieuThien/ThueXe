import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader, ErrorState, HeaderTextButton, LoadingState } from "../../components";
import { QUERY_KEY_FACTORY } from "../../constants";
import { useRentalLocationTracking } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { rentalApi } from "../../services";
import { useTheme } from "../../theme";
import { formatCurrencyVND, formatDateTimeVN } from "../../utils/format";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalBookingDetail">;

// ── Status mappings ───────────────────────────────────────────────────────────

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  in_progress: "Đang thuê",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#0ea5e9",
  in_progress: "#6366f1",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ thanh toán",
  deposit_paid: "Đã đặt cọc",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  deposit_paid: "#8b5cf6",
  paid: "#10b981",
  refunded: "#64748b",
};

const SERVICE_TYPE_LABEL: Record<number, string> = {
  1: "Thuê xe tự lái",
  2: "Thuê tài xế",
  3: "Thuê xe kèm tài xế",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          { color: valueColor ?? theme.colors.text },
          bold && { fontWeight: "700" },
        ]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

function RowWithPhoneCall(
  { label, value, phoneNumber, valueColor, bold }:
    { label: string; value: string; phoneNumber?: string; valueColor?: string; bold?: boolean }
) {
  const { theme } = useTheme();
  const handleCallDriver = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.rowWithButton}>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]}>{label}</Text>
        <Text
          style={[
            styles.rowValue,
            { color: valueColor ?? theme.colors.text },
            bold && { fontWeight: "700" },
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
      {phoneNumber && (
        <Pressable
          style={[styles.callButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => handleCallDriver(phoneNumber)}
        >
          <Ionicons name="call" size={16} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

function Divider() {
  const { theme } = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "18", borderColor: color + "50" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function RentalBookingDetailScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { bookingId } = route.params;

  const query = useQuery({
    queryKey: QUERY_KEY_FACTORY.bookings.detail(bookingId),
    queryFn: async () => {
      const res = await rentalApi.getBookingDetail(bookingId);
      return (res.data as { booking: Record<string, unknown> }).booking;
    },
    enabled: Boolean(bookingId),
  });

  const orderData = query.data as Record<string, any> | undefined;
  const orderStatus = String(orderData?.status ?? "").toLowerCase();
  const paymentStatus = String(orderData?.payment_status ?? "").toLowerCase();
  const serviceType = Number(orderData?.service_type ?? 1);

  useRentalLocationTracking(orderData?.rental_id, orderStatus === "in_progress");

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Chi tiết đơn thuê" leftAction={<HeaderTextButton label="Quay lại" onPress={() => navigation.goBack()} />} />

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState onRetry={query.refetch} description="Không tải được chi tiết đơn thuê" /> : null}

      {orderData ? (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={[styles.headerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View>
              <Text style={[styles.codeLabel, { color: theme.colors.textMuted }]}>MÃ ĐƠN</Text>
              <Text style={[styles.codeValue, { color: theme.colors.text }]}>
                {String(orderData.rental_code ?? orderData.rental_id ?? "—")}
              </Text>
            </View>
          </View>
          <Section title="Trạng thái">
            <View style={styles.badges}>
              <Badge
                label={ORDER_STATUS_LABEL[orderStatus] ?? orderStatus}
                color={ORDER_STATUS_COLOR[orderStatus] ?? "#64748b"}
              />
              <Badge
                label={PAYMENT_STATUS_LABEL[paymentStatus] ?? paymentStatus}
                color={PAYMENT_STATUS_COLOR[paymentStatus] ?? "#64748b"}
              />
            </View>
          </Section>
          {/* ── Thông tin gói thuê ──────────────────────────────────────────── */}
          <Section title="Gói thuê">
            <Row label="Tên gói" value={String(orderData.package_name ?? "—")} bold />
            <Row label="Loại dịch vụ" value={SERVICE_TYPE_LABEL[serviceType] ?? "—"} />
          </Section>

          {/* ── Thời gian & địa điểm ───────────────────────────────────────── */}
          <Section title="Thời gian & Địa điểm">
            <Row label="Bắt đầu" value={orderData.start_datetime ? formatDateTimeVN(String(orderData.start_datetime)) : "—"} />
            <Row
              label="Kết thúc"
              value={
                orderData.actual_end_datetime
                  ? formatDateTimeVN(String(orderData.actual_end_datetime))
                  : orderData.end_datetime
                    ? formatDateTimeVN(String(orderData.end_datetime))
                    : "—"
              }
            />
            <Row label="Điểm đón" value={String(orderData.pickup_address ?? "—")} />
            {orderData.dropoff_address ? <Row label="Điểm trả" value={String(orderData.dropoff_address)} /> : null}
          </Section>

          {/* ── Xe & Tài xế ────────────────────────────────────────────────── */}
          {(orderData.vehicle || orderData.driver || orderData.owner_name || orderData.owner_phone) ? (
            <Section title="Thông tin phương tiện">
              {orderData.vehicle ? (
                <>
                  <Row label="Biển số xe" value={String(orderData.vehicle.plate_number ?? "—")} bold />
                  {orderData.vehicle.vehicle_type ? (
                    <Row label="Loại xe" value={String(orderData.vehicle.vehicle_type)} />
                  ) : null}
                </>
              ) : null}
              {orderData.owner_name || orderData.owner_phone ? (
                <RowWithPhoneCall
                  label="Chủ xe"
                  value={String(orderData.owner_name ?? orderData.owner_phone ?? "—")}
                  phoneNumber={orderData.owner_phone}
                  bold
                />
              ) : null}
              {orderData.driver ? (
                <>
                  <Row label="Tài xế" value={String(orderData.driver.name ?? "—")} bold />
                  <Row label="Đánh giá" value={orderData.driver.rating ? `${Number(orderData.driver.rating).toFixed(1)} ★` : "Chưa có"} />
                </>
              ) : null}
              {Number(orderData.distance_limit_km) > 0 ? (
                <Row label="Giới hạn quãng đường" value={`${orderData.distance_limit_km} km`} />
              ) : null}
              {Number(orderData.distance_travelled_km) > 0 ? (
                <Row label="Đã đi" value={`${orderData.distance_travelled_km} km`} />
              ) : null}
            </Section>
          ) : null}

          {/* ── Chi phí ────────────────────────────────────────────────────── */}
          <Section title="Chi phí">
            {orderData.payment_method ? (
              <Row label="Phương thức" value={String(orderData.payment_method)} />
            ) : null}
            <Row label="Giá thuê cơ bản" value={formatCurrencyVND(Number(orderData.base_price ?? 0))} />
            {Number(orderData.extra_time_fee) > 0 ? (
              <Row label="Phí thêm giờ" value={formatCurrencyVND(Number(orderData.extra_time_fee))} />
            ) : null}
            {Number(orderData.extra_distance_fee) > 0 ? (
              <Row label="Phí thêm quãng đường" value={formatCurrencyVND(Number(orderData.extra_distance_fee))} />
            ) : null}
            {Number(orderData.deposit_amount) > 0 ? (
              <Row
                label="Tiền đặt cọc"
                value={formatCurrencyVND(Number(orderData.deposit_amount))}
                valueColor={theme.colors.textMuted}
              />
            ) : null}
            <Divider />
            <Row
              label="Tổng tiền (đã tính cọc)"
              value={formatCurrencyVND(Number(orderData.total_price ?? 0))}
              bold
              valueColor={theme.colors.primary}
            />
          </Section>

          {/* ── Lý do hủy ──────────────────────────────────────────────────── */}
          {orderData.cancel_reason ? (
            <View style={[styles.cancelBox, { borderColor: "#ef444440", backgroundColor: "#ef444410" }]}>
              <Text style={[styles.cancelLabel, { color: "#ef4444" }]}>Lý do hủy</Text>
              <Text style={[styles.cancelReason, { color: theme.colors.text }]}>{String(orderData.cancel_reason)}</Text>
            </View>
          ) : null}

        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 16, gap: 12, paddingBottom: 32 },

  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  codeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  codeValue: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  badges: { gap: 6, flexDirection: "row", flexWrap: "wrap" },

  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: -2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rowLabel: { fontSize: 13, flex: 1 },
  rowValue: { fontSize: 13, flex: 2, textAlign: "right" },
  rowWithButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  rowContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  divider: { height: 1, marginVertical: 2 },

  cancelBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  cancelLabel: { fontSize: 12, fontWeight: "800" },
  cancelReason: { fontSize: 13, lineHeight: 18 },
});
