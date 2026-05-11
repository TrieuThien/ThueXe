import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";

import {
    AppHeader,
    PrimaryButton,
    TextField,
} from "../../components";
import type { AddressSuggestion } from "../../hooks";
import {
    useAddressAutocomplete,
    useCurrentLocation,
} from "../../hooks";
import { resolveGooglePlaceDetails } from "../../utils/googlePlaces";
import { BookingStackParamList } from "../../navigation";
import { useRideFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { reverseGeocodeToDisplayAddress } from "../../utils/address";
import type { Coordinate } from "../../types";

type Props = NativeStackScreenProps<BookingStackParamList, "RideLocationPickup">;

export function RideLocationPickupScreen({ navigation }: Props) {
    const { theme } = useTheme();
    const location = useCurrentLocation(true);
    const mapRef = useRef<MapView>(null);
    const initializedRef = useRef(false);

    const [addressInput, setAddressInput] = useState("");
    const [selectedAddress, setSelectedAddress] = useState<string | undefined>();
    const [selectedCoord, setSelectedCoord] = useState<Coordinate | undefined>();
    const [showSuggestions, setShowSuggestions] = useState(true);

    const locationBias = location.data
        ? {
            latitude: location.data.latitude,
            longitude: location.data.longitude,
            accuracy: location.data.accuracy ?? undefined,
            currentLocation: location.data.address
                ? {
                    label: location.data.address,
                    latitude: location.data.latitude,
                    longitude: location.data.longitude,
                }
                : undefined,
        }
        : undefined;

    const autocomplete = useAddressAutocomplete(addressInput, locationBias);

    // Auto-fill pickup with current location on first load only
    useEffect(() => {
        if (!initializedRef.current && location.data?.address) {
            setAddressInput(location.data.address);
            setSelectedAddress(location.data.address);
            setSelectedCoord({
                latitude: location.data.latitude,
                longitude: location.data.longitude,
            });
            initializedRef.current = true;
        }
    }, [location.data?.address, location.data?.latitude, location.data?.longitude]);

    // Animate map to selected coordinate
    useEffect(() => {
        if (selectedCoord && mapRef.current) {
            mapRef.current.animateToRegion(
                {
                    latitude: selectedCoord.latitude,
                    longitude: selectedCoord.longitude,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                },
                300
            );
        }
    }, [selectedCoord]);

    // Handle reverse geocoding when user taps map
    useEffect(() => {
        const reverseGeocode = async () => {
            if (!selectedCoord) return;
            try {
                const address = await reverseGeocodeToDisplayAddress(
                    selectedCoord.latitude,
                    selectedCoord.longitude
                );
                if (address) {
                    setAddressInput(address);
                    setSelectedAddress(address);
                }
            } catch {
                // Ignore reverse geocoding errors
            }
        };
        reverseGeocode();
    }, [selectedCoord]);

    const handleClearAddress = () => {
        setAddressInput("");
        setSelectedAddress(undefined);
        setSelectedCoord(undefined);
        setShowSuggestions(true);
    };

    const handleSelectSuggestion = async (item: AddressSuggestion) => {
        initializedRef.current = false;

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

    const handleContinue = () => {
        if (!selectedAddress || !selectedCoord) {
            return;
        }

        navigation.navigate("RideLocationDropoff", {
            pickupLocation: {
                address: selectedAddress,
                coordinate: selectedCoord,
            },
        });
    };

    if (Platform.OS === "web") {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
                <AppHeader title="Chọn điểm đón" />
                <Text style={[styles.webPlaceholder, { color: theme.colors.text }]}>
                    Map không khả dụng trên web
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Chọn điểm đón" />

            <View style={styles.container}>
                {/* Address Input and Suggestions */}
                <View style={styles.addressPanel}>
                    <ScrollView contentContainerStyle={styles.addressContent} scrollEnabled={false}>
                        <View style={styles.inputSection}>
                            <TextField
                                label="Điểm đón"
                                value={addressInput}
                                onChangeText={(text) => {
                                    initializedRef.current = false;
                                    setShowSuggestions(true);
                                    setAddressInput(text);
                                    if (text.length === 0) {
                                        handleClearAddress();
                                    }
                                }}
                                placeholder="Nhập địa chỉ đón"
                                selectTextOnFocus
                                keyboardType="default"
                                returnKeyType="search"
                            />

                            {addressInput && (
                                <Pressable onPress={handleClearAddress} style={styles.clearButton}>
                                    <Text style={[styles.clearButtonText, { color: theme.colors.primary }]}>
                                        Xóa
                                    </Text>
                                </Pressable>
                            )}
                        </View>

                        {autocomplete.loading && (
                            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                                Đang tải gợi ý địa chỉ...
                            </Text>
                        )}

                        {!autocomplete.loading &&
                            showSuggestions &&
                            addressInput.trim().length >= 2 &&
                            autocomplete.suggestions.filter((s) => !s.isCurrentLocation).length === 0 && (
                                <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                                    Không tìm thấy gợi ý phù hợp
                                </Text>
                            )}

                        {showSuggestions && autocomplete.suggestions.length > 0 && (
                            <View
                                style={[
                                    styles.suggestionList,
                                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                                ]}
                            >
                                {autocomplete.suggestions.map((item, index) => (
                                    <Pressable
                                        key={item.id}
                                        onPress={() => handleSelectSuggestion(item)}
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
                        )}
                    </ScrollView>
                </View>

                {/* Map */}
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        latitude: selectedCoord?.latitude || location.data?.latitude || 10.7769,
                        longitude: selectedCoord?.longitude || location.data?.longitude || 106.7009,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    onPress={(e) => {
                        setSelectedCoord(e.nativeEvent.coordinate);
                    }}
                >
                    {selectedCoord && (
                        <Marker coordinate={selectedCoord} title={selectedAddress || "Vị trí đã chọn"} />
                    )}
                </MapView>

                {/* Button at Bottom */}
                <View style={[styles.buttonContainer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
                    <PrimaryButton
                        title="Chọn điểm đón"
                        onPress={handleContinue}
                        disabled={!selectedAddress || !selectedCoord}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        flexDirection: "column",
    },
    addressPanel: {
        maxHeight: "40%",
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    addressContent: {
        padding: 16,
        gap: 12,
    },
    inputSection: {
        position: "relative",
    },
    clearButton: {
        position: "absolute",
        right: 12,
        top: 36,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    clearButtonText: {
        fontSize: 12,
        fontWeight: "600",
    },
    hint: {
        fontSize: 12,
    },
    suggestionList: {
        borderWidth: 1,
        borderRadius: 10,
        overflow: "hidden",
    },
    suggestionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    suggestionItemLast: {
        borderBottomWidth: 0,
    },
    suggestionText: {
        fontSize: 13,
    },
    map: {
        flex: 1,
    },
    buttonContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    webPlaceholder: {
        padding: 16,
        fontSize: 14,
        textAlign: "center",
    },
});
