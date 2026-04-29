import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "../../components";
import { useCurrentLocation } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";
import { reverseGeocodeToDisplayAddress } from "../../utils/address";
import type { Coordinate } from "../../types";
import { PrimaryButton } from "../../components";
import { useRentalFlowStore } from "../../store";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalLocationMapPicker">;

export function RentalLocationMapPickerScreen({ route, navigation }: Props) {
    const { theme } = useTheme();
    const { addressType } = route.params;
    const location = useCurrentLocation(true);
    const criteria = useRentalFlowStore((state) => state.criteria);
    const setCriteria = useRentalFlowStore((state) => state.setCriteria);
    const mapRef = useRef<any>(null);

    const [selectedCoord, setSelectedCoord] = useState<Coordinate | null>(null);
    const [selectedAddress, setSelectedAddress] = useState<string>("");
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);

    useEffect(() => {
        // Initialize with current location if available
        if (!selectedCoord && location.data?.latitude && location.data?.longitude) {
            setSelectedCoord({
                latitude: location.data.latitude,
                longitude: location.data.longitude,
            });
        }
    }, [location.data?.latitude, location.data?.longitude, selectedCoord]);

    useEffect(() => {
        // Reverse geocode when coordinate changes
        if (selectedCoord) {
            const performReverseGeocoding = async () => {
                setIsLoadingAddress(true);
                try {
                    const address = await reverseGeocodeToDisplayAddress(selectedCoord.latitude, selectedCoord.longitude);
                    setSelectedAddress(address || "");
                } catch (error) {
                    setSelectedAddress("");
                } finally {
                    setIsLoadingAddress(false);
                }
            };
            performReverseGeocoding();
        }
    }, [selectedCoord]);

    // Animate map to selected coordinate
    useEffect(() => {
        if (selectedCoord && mapRef.current && Platform.OS !== "web") {
            mapRef.current.animateToRegion(
                {
                    ...selectedCoord,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                },
                300,
            );
        }
    }, [selectedCoord]);

    const handleMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setSelectedCoord({ latitude, longitude });
    };

    const handleConfirm = () => {
        if (!selectedCoord || !selectedAddress) {
            return;
        }

        if (!criteria) {
            return;
        }

        // Update criteria with the selected location based on addressType
        if (addressType === "pickup") {
            setCriteria({
                ...criteria,
                pickupAddress: selectedAddress,
                pickupCoordinate: selectedCoord,
            });
            navigation.navigate("RentalLocationDropoff", {
                pickupLocation: {
                    address: selectedAddress,
                    coordinate: selectedCoord,
                },
            });
        } else {
            setCriteria({
                ...criteria,
                dropoffAddress: selectedAddress,
                dropoffCoordinate: selectedCoord,
            });
            navigation.navigate("RentalPackageList");
        }
    };

    const renderMap = () => {
        if (Platform.OS === "web") {
            return (
                <View style={[styles.mapWrap, styles.webFallback]}>
                    <Text style={styles.webTitle}>Bản đồ native không hỗ trợ trên web preview.</Text>
                    {selectedCoord && (
                        <Text style={styles.webLine}>
                            Vị trí: {selectedCoord.latitude.toFixed(5)}, {selectedCoord.longitude.toFixed(5)}
                        </Text>
                    )}
                </View>
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const maps = require("react-native-maps") as {
            default: any;
            Marker: any;
        };
        const MapView = maps.default;
        const Marker = maps.Marker;

        const initialRegion = selectedCoord || (location.data && {
            latitude: location.data.latitude,
            longitude: location.data.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        }) || {
            latitude: 10.7769,
            longitude: 106.7009,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        };

        return (
            <View style={styles.mapWrap}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    onPress={handleMapPress}
                >
                    {selectedCoord && (
                        <Marker
                            coordinate={selectedCoord}
                            title={addressType === "pickup" ? "Điểm đón" : "Điểm trả"}
                            description={selectedAddress || "Đang tải địa chỉ..."}
                        />
                    )}
                </MapView>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <AppHeader
                title={addressType === "pickup" ? "Chọn điểm đón" : "Chọn điểm trả"}
                leftAction={
                    <Pressable onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                    </Pressable>
                }
            />
            {renderMap()}

            <View style={[styles.selectionPanel, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                <View style={styles.selectionInfo}>
                    <Text style={[styles.coordinateLabel, { color: theme.colors.textMuted }]}>
                        Tọa độ: {selectedCoord ? `${selectedCoord.latitude.toFixed(4)}, ${selectedCoord.longitude.toFixed(4)}` : "Chưa chọn"}
                    </Text>
                    <Text style={[styles.addressDisplay, { color: theme.colors.text }]} numberOfLines={2}>
                        {isLoadingAddress ? "Đang tải địa chỉ..." : selectedAddress || "Nhấn trên bản đồ để chọn vị trí"}
                    </Text>
                </View>

                <View style={styles.actions}>
                    <Pressable
                        style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Hủy</Text>
                    </Pressable>
                    <PrimaryButton
                        title="Xác nhận"
                        onPress={handleConfirm}
                        disabled={!selectedCoord || isLoadingAddress || !selectedAddress}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    mapWrap: { flex: 1 },
    map: { flex: 1 },
    webFallback: {
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    webTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    webLine: {
        fontSize: 14,
    },
    selectionPanel: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    selectionInfo: {
        gap: 4,
    },
    coordinateLabel: {
        fontSize: 12,
        fontWeight: "500",
    },
    addressDisplay: {
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 20,
    },
    actions: {
        flexDirection: "row",
        gap: 8,
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: "700",
    },
});
