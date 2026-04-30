import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader, BookingStatusBadge, EmptyState, ErrorState, LoadingState } from "../../components";
import { useRentalBookingsQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { RentalBooking } from "../../types";
import { useTheme } from "../../theme";
import { formatCurrencyVND, formatDateTimeVN } from "../../utils/format";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalHistory">;

const RENTAL_STATUS_LABELS: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    in_progress: "Đang thuê",
    on_going: "Đang thuê",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
};

const RENTAL_STATUS_COLORS: Record<string, string> = {
    pending: "#f59e0b",
    confirmed: "#0ea5e9",
    in_progress: "#6366f1",
    on_going: "#6366f1",
    completed: "#10b981",
    cancelled: "#ef4444",
};

function RentalCarCard({
    booking,
    onPress,
    onCallDriver,
}: {
    booking: RentalBooking;
    onPress: () => void;
    onCallDriver: (phoneNumber: string) => void;
}) {
    const { theme } = useTheme();
    const rawStatus = String((booking as any)._rawStatus ?? booking.status ?? "").toLowerCase();
    const statusLabel = RENTAL_STATUS_LABELS[rawStatus] ?? String(booking.status);
    const statusColor = RENTAL_STATUS_COLORS[rawStatus] ?? theme.colors.textMuted;
    const isOnGoing = booking.status === "ON_GOING";
    const driverPhone = booking.driver?.phoneNumber;

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

            {/* Hiển thị thông tin tài xế khi đang thuê */}
            {isOnGoing && booking.driver && (
                <View style={[styles.driverInfo, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <View style={styles.driverDetailsRow}>
                        <View style={styles.driverDetails}>
                            <Text style={[styles.driverName, { color: theme.colors.text }]}>{booking.driver.fullName}</Text>
                            {driverPhone && (
                                <Text style={[styles.driverPhone, { color: theme.colors.textMuted }]}>{driverPhone}</Text>
                            )}
                        </View>
                        {driverPhone && (
                            <Pressable
                                style={[styles.callButton, { backgroundColor: theme.colors.primary }]}
                                onPress={() => onCallDriver(driverPhone)}
                            >
                                <Ionicons name="call" size={18} color="#fff" />
                            </Pressable>
                        )}
                    </View>
                </View>
            )}
        </Pressable>
    );
}

export function RentalHistoryScreen({ navigation }: Props) {
    const { theme } = useTheme();
    const rentalQuery = useRentalBookingsQuery();

    const handleCallDriver = (phoneNumber: string) => {
        Linking.openURL(`tel:${phoneNumber}`);
    };

    // Filter only RENTAL_CAR bookings
    const rentalCarBookings = (rentalQuery.data ?? []).filter(
        (booking) => booking.rideType === "RENTAL_CAR"
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Lịch sử thuê xe" />

            <ScrollView contentContainerStyle={styles.container}>
                {rentalQuery.isLoading ? <LoadingState /> : null}
                {rentalQuery.isError ? <ErrorState onRetry={rentalQuery.refetch} /> : null}

                {!rentalQuery.isLoading && !rentalQuery.isError && rentalCarBookings.length === 0 ? (
                    <EmptyState title="Chưa có lịch sử thuê xe" />
                ) : null}

                {rentalCarBookings.map((booking) => (
                    <RentalCarCard
                        key={booking.id}
                        booking={booking}
                        onPress={() => navigation.navigate("RentalBookingDetail", { bookingId: booking.id })}
                        onCallDriver={handleCallDriver}
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: {
        padding: 16,
        gap: 10,
    },
    item: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 10,
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
        fontSize: 14,
        fontWeight: "700",
    },
    driverInfo: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginTop: 8,
    },
    driverDetailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 4,
    },
    driverPhone: {
        fontSize: 12,
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },
});
