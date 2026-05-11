import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, PrimaryButton } from "../../components";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";
import { socketService } from "../../services/api/socketService";
import { apiClient } from "../../services/api/client";
import { APP_CONFIG } from "../../constants";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalSearchingDriver">;

type ScreenState = "searching" | "found" | "timeout" | "error" | "cancelled";

interface DriverInfo {
    name?: string;
    rating?: number;
    licensePlate?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
}

export function RentalSearchingDriverScreen({ navigation, route }: Props) {
    const { theme } = useTheme();
    const rentalId = String(route.params.rentalId || "");

    const [screenState, setScreenState] = useState<ScreenState>("searching");
    const [secondsLeft, setSecondsLeft] = useState(60);
    const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
    const [refunded, setRefunded] = useState(false);
    const [refundAmount, setRefundAmount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Countdown timer
    useEffect(() => {
        if (screenState !== "searching") return;

        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [screenState]);

    // Socket event listeners
    useEffect(() => {
        if (!rentalId) return;

        const handleDriverAssigned = (data: any) => {
            if (data.rentalId === rentalId) {
                setScreenState("found");
                setDriverInfo({
                    name: data.driverName,
                    rating: data.driverRating,
                    licensePlate: data.licensePlate,
                    vehicleBrand: data.vehicleBrand,
                    vehicleModel: data.vehicleModel,
                });
            }
        };

        const handleRentalCancelled = (data: any) => {
            if (data.rentalId === rentalId) {
                setScreenState("timeout");
                if (data.refunded) {
                    setRefunded(true);
                    setRefundAmount(data.refundAmount || 0);
                }
            }
        };

        // Register listeners
        socketService.on("driver_assigned", handleDriverAssigned);
        socketService.on("rental_cancelled_no_driver", handleRentalCancelled);

        return () => {
            socketService.off("driver_assigned", handleDriverAssigned);
            socketService.off("rental_cancelled_no_driver", handleRentalCancelled);
        };
    }, [rentalId]);

    const handleCancel = async () => {
        try {
            setIsLoading(true);
            await apiClient.delete(`${APP_CONFIG.customerApiPrefix}/rentals/${rentalId}`);
            setScreenState("cancelled");
        } catch (error) {
            console.error("Error cancelling rental:", error);
            setScreenState("error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoHome = () => {
        navigation.navigate("BookingHome");
    };

    const handleViewDetails = () => {
        navigation.navigate("RentalBookingDetail", { bookingId: rentalId });
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Đang tìm tài xế" />

            <View style={styles.container}>
                {/* SEARCHING STATE */}
                {screenState === "searching" && (
                    <>
                        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={[styles.title, { color: theme.colors.text }]}>🔍 Đang tìm tài xế...</Text>
                            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                                Hệ thống đang tìm tài xế phù hợp cho yêu cầu của bạn
                            </Text>
                        </View>

                        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <View style={styles.countdownContainer}>
                                <Text style={[styles.countdownText, { color: theme.colors.primary }]}>{secondsLeft}s</Text>
                                <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { backgroundColor: theme.colors.primary, width: `${(secondsLeft / 60) * 100}%` },
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>

                        <PrimaryButton
                            title="Hủy yêu cầu"
                            onPress={handleCancel}
                            loading={isLoading}
                            style={{ backgroundColor: theme.colors.error }}
                        />
                    </>
                )}

                {/* FOUND STATE */}
                {screenState === "found" && driverInfo && (
                    <>
                        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <Text style={[styles.successTitle, { color: theme.colors.success }]}>✅ Đã tìm được tài xế!</Text>

                            <View style={styles.driverCard}>
                                <View style={styles.driverInfo}>
                                    <Text style={[styles.driverName, { color: theme.colors.text }]}>
                                        {driverInfo.name || "Tài xế"}
                                    </Text>
                                    {driverInfo.rating && (
                                        <Text style={[styles.driverRating, { color: theme.colors.textMuted }]}>
                                            ⭐ {driverInfo.rating.toFixed(1)}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {driverInfo.licensePlate && (
                                <Text style={[styles.vehicleInfo, { color: theme.colors.textMuted }]}>
                                    📍 Biển số: {driverInfo.licensePlate}
                                </Text>
                            )}

                            {driverInfo.vehicleBrand && driverInfo.vehicleModel && (
                                <Text style={[styles.vehicleInfo, { color: theme.colors.textMuted }]}>
                                    🚗 {driverInfo.vehicleBrand} {driverInfo.vehicleModel}
                                </Text>
                            )}
                        </View>

                        <PrimaryButton title="Xem chi tiết đơn" onPress={handleViewDetails} />
                    </>
                )}

                {/* TIMEOUT STATE */}
                {screenState === "timeout" && (
                    <>
                        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}>
                            <Text style={[styles.timeoutTitle, { color: theme.colors.error }]}>❌ Không tìm được tài xế</Text>
                            <Text style={[styles.timeoutMessage, { color: theme.colors.textMuted }]}>
                                Hiện tại không có tài xế phù hợp trong khu vực của bạn. Vui lòng thử lại sau.
                            </Text>

                            {refunded && (
                                <View
                                    style={[
                                        styles.refundBox,
                                        { backgroundColor: theme.colors.success + "20", borderColor: theme.colors.success },
                                    ]}
                                >
                                    <Text style={[styles.refundTitle, { color: theme.colors.success }]}>💰 Đã hoàn tiền</Text>
                                    <Text style={[styles.refundAmount, { color: theme.colors.success }]}>
                                        {refundAmount.toLocaleString("vi-VN")}đ
                                    </Text>
                                    <Text style={[styles.refundSubtitle, { color: theme.colors.textMuted }]}>
                                        Tiền đã được hoàn lại vào ví ThueXe
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.buttonGroup}>
                            <PrimaryButton title="Đặt lại" onPress={() => handleGoHome()} />
                            <PrimaryButton
                                title="Về trang chủ"
                                onPress={handleGoHome}
                                style={{ backgroundColor: theme.colors.secondary }}
                            />
                        </View>
                    </>
                )}

                {/* CANCELLED STATE */}
                {screenState === "cancelled" && (
                    <>
                        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}>
                            <Text style={[styles.timeoutTitle, { color: theme.colors.error }]}>⚠️ Yêu cầu đã bị hủy</Text>
                            <Text style={[styles.timeoutMessage, { color: theme.colors.textMuted }]}>
                                Yêu cầu thuê tài xế của bạn đã bị hủy thành công.
                            </Text>
                        </View>

                        <PrimaryButton title="Về trang chủ" onPress={handleGoHome} />
                    </>
                )}

                {/* ERROR STATE */}
                {screenState === "error" && (
                    <>
                        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}>
                            <Text style={[styles.timeoutTitle, { color: theme.colors.error }]}>⚠️ Có lỗi xảy ra</Text>
                            <Text style={[styles.timeoutMessage, { color: theme.colors.textMuted }]}>
                                Vui lòng thử lại hoặc liên hệ với bộ phận hỗ trợ.
                            </Text>
                        </View>

                        <PrimaryButton title="Về trang chủ" onPress={handleGoHome} />
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: {
        flex: 1,
        padding: 16,
        gap: 16,
        paddingBottom: 28,
    },
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
        gap: 12,
        alignItems: "center",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    timeoutTitle: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
    },
    timeoutMessage: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
    infoCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    countdownContainer: {
        alignItems: "center",
        gap: 8,
    },
    countdownText: {
        fontSize: 32,
        fontWeight: "700",
    },
    progressBar: {
        width: "100%",
        height: 8,
        borderRadius: 4,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
    },
    driverCard: {
        width: "100%",
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "rgba(0,0,0,0.1)",
    },
    driverInfo: {
        gap: 4,
    },
    driverName: {
        fontSize: 16,
        fontWeight: "700",
    },
    driverRating: {
        fontSize: 13,
    },
    vehicleInfo: {
        fontSize: 13,
        lineHeight: 18,
    },
    refundBox: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 6,
        alignItems: "center",
        marginTop: 8,
    },
    refundTitle: {
        fontSize: 14,
        fontWeight: "600",
    },
    refundAmount: {
        fontSize: 20,
        fontWeight: "700",
    },
    refundSubtitle: {
        fontSize: 12,
    },
    buttonGroup: {
        gap: 12,
    },
});
