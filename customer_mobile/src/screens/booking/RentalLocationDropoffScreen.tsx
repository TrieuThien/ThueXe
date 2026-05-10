import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, PrimaryButton } from "../../components";
import type { AddressSuggestion } from "../../hooks";
import { useAddressAutocomplete, useCurrentLocation } from "../../hooks";
import { resolveGooglePlaceDetails } from "../../utils/googlePlaces";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { reverseGeocodeToDisplayAddress } from "../../utils/address";
import type { Coordinate } from "../../types";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalLocationDropoff">;

export function RentalLocationDropoffScreen({ route, navigation }: Props) {
    const { theme } = useTheme();
    const location = useCurrentLocation(true);
    const setCriteria = useRentalFlowStore((state) => state.setCriteria);
    const criteria = useRentalFlowStore((state) => state.criteria);
    const setExtraInfo = useRentalFlowStore((state) => state.setExtraInfo);
    const mapRef = useRef<any>(null);

    const { pickupLocation } = route.params;

    const [addressInput, setAddressInput] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [selectedCoord, setSelectedCoord] = useState<Coordinate | null>(null);
    const [selectedAddress, setSelectedAddress] = useState("");
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);

    const autocomplete = useAddressAutocomplete(
        addressInput,
        location.data
            ? {
                latitude: location.data.latitude,
                longitude: location.data.longitude,
                currentLocation: location.data.address
                    ? {
                        label: location.data.address,
                        latitude: location.data.latitude,
                        longitude: location.data.longitude,
                    }
                    : undefined,
            }
            : undefined,
    );

    // Reverse geocode when coordinates change (only if not typing new address)
    useEffect(() => {
        if (selectedCoord) {
            const fetchAddress = async () => {
                setIsLoadingAddress(true);
                try {
                    const address = await reverseGeocodeToDisplayAddress(
                        selectedCoord.latitude,
                        selectedCoord.longitude,
                    );
                    if (address) {
                        setSelectedAddress(address);
                    }
                } catch {
                    // Ignore errors
                } finally {
                    setIsLoadingAddress(false);
                }
            };
            fetchAddress();
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

    const handleSuggestionSelect = async (item: AddressSuggestion) => {
        if (item.isCurrentLocation) {
            setAddressInput(item.label);
            setSelectedAddress(item.label);
            if (typeof item.latitude === "number" && typeof item.longitude === "number") {
                setSelectedCoord({ latitude: item.latitude, longitude: item.longitude });
            }
        } else if (item.placeId) {
            const details = await resolveGooglePlaceDetails(item.placeId);
            const address = details?.formattedAddress || item.label;
            setAddressInput(address);
            setSelectedAddress(address);
            if (details) {
                setSelectedCoord({ latitude: details.latitude, longitude: details.longitude });
            }
        } else {
            const resolved = typeof item.latitude === "number" && typeof item.longitude === "number"
                ? await reverseGeocodeToDisplayAddress(item.latitude, item.longitude).catch(() => null)
                : null;
            const nextLabel = resolved ?? item.label;
            setAddressInput(nextLabel);
            setSelectedAddress(nextLabel);
            if (typeof item.latitude === "number" && typeof item.longitude === "number") {
                setSelectedCoord({ latitude: item.latitude, longitude: item.longitude });
            }
        }
        setShowSuggestions(false);
    };

    const handleMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setSelectedCoord({ latitude, longitude });
        setAddressInput("");
    };

    const handleClearAddress = () => {
        setAddressInput("");
        setShowSuggestions(true);
        // Reset selected coordinate to allow fresh selection
        setSelectedCoord(null);
        setSelectedAddress("");
    };

    const handleContinue = () => {
        if (!selectedCoord && !isSkipping) {
            return;
        }

        // Update criteria with both pickup and dropoff
        if (criteria) {
            setCriteria({
                ...criteria,
                pickupAddress: pickupLocation.address,
                pickupCoordinate: pickupLocation.coordinate,
                dropoffAddress: addressInput || selectedAddress,
                dropoffCoordinate: selectedCoord || undefined,
            });
        }

        // Navigate to package list
        navigation.navigate("RentalPackageList");
    };

    const handleSkip = () => {
        setIsSkipping(true);
        if (criteria) {
            setCriteria({
                ...criteria,
                pickupAddress: pickupLocation.address,
                pickupCoordinate: pickupLocation.coordinate,
                dropoffAddress: undefined,
                dropoffCoordinate: undefined,
            });
        }
        navigation.navigate("RentalPackageList");
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
                            title="Điểm trả"
                            description={selectedAddress || "Đang tải địa chỉ..."}
                        />
                    )}
                </MapView>
            </View>
        );
    };

    const displayAddress = addressInput || selectedAddress;

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <AppHeader
                title="Chọn điểm trả"
                leftAction={
                    <Pressable onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                    </Pressable>
                }
            />



            {/* Address Input Panel */}
            <View style={[styles.addressPanel, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                {/* Pickup Location Summary */}
                <View style={styles.summarySection}>
                    <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Điểm giao xe đã chọn</Text>
                    <View
                        style={[
                            styles.summaryBox,
                            { borderColor: theme.colors.primary, backgroundColor: theme.colors.background },
                        ]}
                    >
                        <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
                        <Text style={[styles.summaryText, { color: theme.colors.text }]} numberOfLines={2}>
                            {pickupLocation.address}
                        </Text>
                    </View>
                </View>

                <View style={styles.inputSection}>
                    <View
                        style={[
                            styles.inputContainer,
                            { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
                        ]}
                    >
                        <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.textMuted} />
                        <TextInput
                            style={[styles.input, { color: theme.colors.text }]}
                            placeholder="Tìm địa chỉ..."
                            placeholderTextColor={theme.colors.textMuted}
                            value={addressInput}
                            onChangeText={(text) => {
                                setAddressInput(text);
                                setShowSuggestions(true);
                                // Clear old address when user clears input to search for new one
                                if (!text) {
                                    setSelectedAddress("");
                                }
                            }}
                            selectTextOnFocus
                            keyboardType="default"
                            returnKeyType="search"
                        />
                        {addressInput ? (
                            <Pressable
                                onPress={handleClearAddress}
                            >
                                <MaterialCommunityIcons name="close" size={18} color={theme.colors.textMuted} />
                            </Pressable>
                        ) : null}
                    </View>

                    {/* Autocomplete suggestions */}
                    {autocomplete.loading ? (
                        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                            Đang gợi ý địa chỉ...
                        </Text>
                    ) : null}

                    {!autocomplete.loading &&
                        showSuggestions &&
                        addressInput.trim().length >= 2 &&
                        autocomplete.suggestions.filter((s) => !s.isCurrentLocation).length === 0 ? (
                        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                            Không tìm thấy gợi ý phù hợp
                        </Text>
                    ) : null}

                    {showSuggestions && autocomplete.suggestions.length > 0 ? (
                        <View
                            style={[
                                styles.suggestionList,
                                { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
                            ]}
                        >
                            {autocomplete.suggestions.map((item, index) => (
                                <Pressable
                                    key={item.id}
                                    onPress={() => handleSuggestionSelect(item)}
                                    style={[
                                        styles.suggestionItem,
                                        index === autocomplete.suggestions.length - 1
                                            ? styles.suggestionItemLast
                                            : null,
                                        { borderBottomColor: theme.colors.border },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name={item.isCurrentLocation ? "crosshairs-gps" : "map-marker-outline"}
                                        size={14}
                                        color={item.isCurrentLocation ? theme.colors.primary : theme.colors.textMuted}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text
                                        style={[styles.suggestionText, { color: theme.colors.text, flex: 1 }]}
                                        numberOfLines={1}
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}
                </View>

                {/* Selected Location Info */}
                <View style={styles.selectionInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
                        <Text style={[styles.addressLabel, { color: theme.colors.text }]} numberOfLines={2}>
                            {isLoadingAddress ? "Đang tải..." : displayAddress || "Nhấn bản đồ để chọn vị trí. Nếu bỏ qua, điểm trả mặc định sẽ là điểm giao xe."}
                        </Text>
                    </View>
                </View>


            </View>

            {/* Map - takes up most of the screen */}
            {renderMap()}

            <View style={[styles.addressPanel, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    <PrimaryButton
                        title="Bỏ qua"
                        onPress={handleSkip}
                        style={{ ...styles.skipButton, borderColor: theme.colors.primary }}
                        textStyle={{ color: theme.colors.text }}
                    />
                    <PrimaryButton
                        title="Tiếp tục"
                        onPress={handleContinue}
                        disabled={!selectedCoord && !isSkipping}
                        style={{ ...styles.continueButton, borderColor: theme.colors.primary }}
                        textStyle={{ color: theme.colors.text }}
                    />
                </View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    mapWrap: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    webFallback: {
        justifyContent: "center",
        alignItems: "center",
    },
    webTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
    },
    webLine: {
        fontSize: 14,
    },
    addressPanel: {
        borderTopWidth: 1,
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    summarySection: {
        gap: 6,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "600",
    },
    summaryBox: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        gap: 8,
    },
    summaryText: {
        flex: 1,
        fontSize: 12,
    },
    inputSection: {
        gap: 6,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        gap: 6,
    },
    input: {
        flex: 1,
        fontSize: 14,
    },
    hint: {
        fontSize: 12,
        marginHorizontal: 4,
    },
    suggestionList: {
        borderWidth: 1,
        borderRadius: 8,
        overflow: "hidden",
        maxHeight: 120,
    },
    suggestionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    suggestionItemLast: {
        borderBottomWidth: 0,
    },
    suggestionText: {
        fontSize: 13,
    },
    selectionInfo: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    addressLabel: {
        fontSize: 13,
        flex: 1,
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 8,
    },
    skipButton: {
        borderWidth: 1,
        backgroundColor: "transparent",
    },
    continueButton: {
        flex: 1,
        borderWidth: 1,
        backgroundColor: "transparent",
    },
});
