import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, BookingStatusBadge, EmptyState, ErrorState, LoadingState } from "../../components";
import { useRentalBookingsQuery, useRideBookingsQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { RentalBooking, RideBooking } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND, formatDateTimeVN } from "../../utils/format";

type Props = NativeStackScreenProps<BookingStackParamList, "BookingHistory">;

type Tab = "ride" | "rental";

const RENTAL_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  in_progress: "Đang thuê",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const RENTAL_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#0ea5e9",
  in_progress: "#6366f1",
  completed: "#10b981",
  cancelled: "#ef4444",
};

function RentalCard({ booking, onPress }: { booking: RentalBooking; onPress: () => void }) {
  const { theme } = useTheme();
  const rawStatus = String((booking as any)._rawStatus ?? booking.status ?? "").toLowerCase();
  const statusLabel = RENTAL_STATUS_LABELS[rawStatus] ?? String(booking.status);
  const statusColor = RENTAL_STATUS_COLORS[rawStatus] ?? theme.colors.textMuted;

  return (
    <Pressable
      style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.packageName, { color: theme.colors.text }]} numberOfLines={1}>
          {(booking as any).packageName ?? "Thuê xe"}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "18", borderColor: statusColor + "50" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={[styles.address, { color: theme.colors.textMuted }]} numberOfLines={1}>
        📍 {booking.pickupAddress || "—"}
      </Text>
      <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>
        🕐 {formatDateTimeVN(booking.startAt)}
      </Text>
      <Text style={[styles.price, { color: theme.colors.primary }]}>
        {formatCurrencyVND(booking.finalTotalPrice ?? booking.estimatedTotalPrice)}
      </Text>
    </Pressable>
  );
}

function RideCard({ booking, onPress }: { booking: RideBooking; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.packageName, { color: theme.colors.text }]} numberOfLines={1}>
          {booking.routeInfo.pickupAddress}
        </Text>
        <BookingStatusBadge status={booking.status} />
      </View>
      <Text style={[styles.address, { color: theme.colors.textMuted }]} numberOfLines={1}>
        🏁 {booking.routeInfo.destinationAddress}
      </Text>
      <Text style={[styles.price, { color: theme.colors.primary }]}>
        {formatCurrencyVND(booking.finalFare ?? booking.estimatedFare)}
      </Text>
    </Pressable>
  );
}

export function BookingHistoryScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("rental");

  const rideQuery = useRideBookingsQuery();
  const rentalQuery = useRentalBookingsQuery();

  const query = activeTab === "ride" ? rideQuery : rentalQuery;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Lịch sử đặt xe" />

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <View style={[styles.tabs, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "rental" && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("rental")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeTab === "rental" ? theme.colors.primary : theme.colors.textMuted }]}>
            Thuê xe
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "ride" && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("ride")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeTab === "ride" ? theme.colors.primary : theme.colors.textMuted }]}>
            Đặt xe
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? <ErrorState onRetry={query.refetch} /> : null}

        {!query.isLoading && !query.isError && (query.data?.length ?? 0) === 0 ? (
          <EmptyState title={activeTab === "rental" ? "Chưa có lịch sử thuê xe" : "Chưa có lịch sử đặt xe"} />
        ) : null}

        {activeTab === "rental"
          ? rentalQuery.data?.map((booking) => (
              <RentalCard
                key={booking.id}
                booking={booking}
                onPress={() => navigation.navigate("RentalBookingDetail", { bookingId: booking.id })}
              />
            ))
          : rideQuery.data?.map((booking) => (
              <RideCard
                key={booking.id}
                booking={booking}
                onPress={() => navigation.navigate("BookingDetail", { bookingId: booking.id })}
              />
            ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },

  container: {
    padding: 16,
    gap: 10,
  },

  item: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  packageName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  address: {
    fontSize: 13,
  },
  dateText: {
    fontSize: 12,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
});
