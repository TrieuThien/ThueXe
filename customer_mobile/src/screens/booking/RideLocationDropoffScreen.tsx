import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";

import type { RideRouteEstimateResponse } from "../../types";

import {
    AppHeader,
    AuthErrorNotice,
    PrimaryButton,
    TextField,
} from "../../components";
import type { AddressSuggestion } from "../../hooks";
import {
    getRideFlowErrorMessage,
    useAddressAutocomplete,
    useCurrentLocation,
    useRideRouteEstimateMutation,
} from "../../hooks";
import { resolveGooglePlaceDetails } from "../../utils/googlePlaces";
import { BookingStackParamList } from "../../navigation";
import { useRideFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { reverseGeocodeToDisplayAddress } from "../../utils/address";
import type { Coordinate } from "../../types";

type Props = NativeStackScreenProps<BookingStackParamList, "RideLocationDropoff">;
type StopEntry = { address: string; coordinate: Coordinate | undefined };

export function RideLocationDropoffScreen({
    route,
    navigation,
}: Props) {
    const { theme } = useTheme();
    const { pickupLocation } = route.params;
    const location = useCurrentLocation(true);
    const mapRef = useRef<MapView>(null);

    const routeMutation = useRideRouteEstimateMutation();
    const setLocationDraft = useRideFlowStore((state) => state.setLocationDraft);

    const [destinationInput, setDestinationInput] = useState("");
    const [selectedDestination, setSelectedDestination] = useState<string | undefined>();
    const [destinationCoord, setDestinationCoord] = useState<Coordinate | undefined>();
    const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(true);

    const [showStopsToggle, setShowStopsToggle] = useState(false);
    const [stop1Input, setStop1Input] = useState("");
    const [stop1Coord, setStop1Coord] = useState<Coordinate | undefined>();
    const [showStop1Suggestions, setShowStop1Suggestions] = useState(true);

    const [stop2Input, setStop2Input] = useState("");
    const [stop2Coord, setStop2Coord] = useState<Coordinate | undefined>();
    const [showStop2Suggestions, setShowStop2Suggestions] = useState(true);

    const [errorMessage, setErrorMessage] = useState<string>();
    const [routeEstimate, setRouteEstimate] = useState<RideRouteEstimateResponse | undefined>();
    const autoEstimateInitializedRef = useRef(false);

    const locationBias = location.data
        ? {
            latitude: location.data.latitude,
            longitude: location.data.longitude,
            accuracy: location.data.accuracy ?? undefined,
        }
        : undefined;

    // Destination gets the "current location" suggestion; stops do not
    const destBias = location.data
        ? {
            ...locationBias!,
            currentLocation: location.data.address
                ? {
                    label: location.data.address,
                    latitude: location.data.latitude,
                    longitude: location.data.longitude,
                }
                : undefined,
        }
        : undefined;

    const destAutocomplete = useAddressAutocomplete(destinationInput, destBias);
    const stop1Autocomplete = useAddressAutocomplete(stop1Input, locationBias);
    const stop2Autocomplete = useAddressAutocomplete(stop2Input, locationBias);

    // Animate map to show route
    useEffect(() => {
        if (!pickupLocation?.coordinate || !destinationCoord || !mapRef.current) {
            return;
        }

        // Calculate bounding box
        const minLat = Math.min(pickupLocation.coordinate.latitude, destinationCoord.latitude);
        const maxLat = Math.max(pickupLocation.coordinate.latitude, destinationCoord.latitude);
        const minLon = Math.min(pickupLocation.coordinate.longitude, destinationCoord.longitude);
        const maxLon = Math.max(pickupLocation.coordinate.longitude, destinationCoord.longitude);

        const latDelta = maxLat - minLat;
        const lonDelta = maxLon - minLon;

        mapRef.current.animateToRegion(
            {
                latitude: (minLat + maxLat) / 2,
                longitude: (minLon + maxLon) / 2,
                latitudeDelta: latDelta * 1.3,
                longitudeDelta: lonDelta * 1.3,
            },
            300
        );
    }, [pickupLocation?.coordinate, destinationCoord]);

    // Handle reverse geocoding when user taps map
    useEffect(() => {
        const reverseGeocode = async () => {
            if (!destinationCoord) return;
            try {
                const address = await reverseGeocodeToDisplayAddress(
                    destinationCoord.latitude,
                    destinationCoord.longitude
                );
                if (address) {
                    setDestinationInput(address);
                    setSelectedDestination(address);
                }
            } catch {
                // Ignore reverse geocoding errors
            }
        };
        reverseGeocode();
    }, [destinationCoord]);

    const handleClearDestination = () => {
        setDestinationInput("");
        setSelectedDestination(undefined);
        setDestinationCoord(undefined);
        setShowDestinationSuggestions(true);
    };

    const resolveSuggestionLabel = async (item: AddressSuggestion): Promise<string> => {
        if (item.placeId) {
            const details = await resolveGooglePlaceDetails(item.placeId).catch(() => null);
            return details?.formattedAddress || item.label;
        }
        if (typeof item.latitude !== "number" || typeof item.longitude !== "number") {
            return item.label;
        }
        try {
            const resolved = await reverseGeocodeToDisplayAddress(item.latitude, item.longitude);
            return resolved ?? item.label;
        } catch {
            return item.label;
        }
    };

    /**
     * Auto-estimate route when destination or stops change
     */
    useEffect(() => {
        if (!destinationCoord || !selectedDestination || autoEstimateInitializedRef.current) {
            return;
        }

        const estimateRoute = async () => {
            try {
                const stopEntries: StopEntry[] = [
                    { address: stop1Input, coordinate: stop1Coord },
                    { address: stop2Input, coordinate: stop2Coord },
                ].filter((item) => item.address.trim().length > 0);

                const stopAddresses = stopEntries.map((item) => item.address);

                const estimate = await routeMutation.mutateAsync({
                    pickupAddress: pickupLocation.address,
                    destinationAddress: selectedDestination,
                    stopAddresses,
                    pickupCoordinate: pickupLocation.coordinate,
                    destinationCoordinate: destinationCoord,
                    stopCoordinates: stopEntries.map((item) => item.coordinate),
                    currentLocation: location.data
                        ? {
                            latitude: location.data.latitude,
                            longitude: location.data.longitude,
                        }
                        : undefined,
                });

                setRouteEstimate(estimate);
                autoEstimateInitializedRef.current = true;
            } catch (error) {
                console.warn("Auto-route estimation failed:", error);
            }
        };

        estimateRoute();
    }, [destinationCoord, selectedDestination, stop1Input, stop1Coord, stop2Input, stop2Coord]);

    /**
     * Build route coordinates array: pickup → stops → destination
     * Uses actual Google Maps polyline if available, otherwise fallback to straight line
     */
    const buildRouteCoordinates = (): Coordinate[] => {
        // Use actual Google Maps route polyline if available
        if (routeEstimate?.polylineCoordinates && routeEstimate.polylineCoordinates.length > 0) {
            return routeEstimate.polylineCoordinates;
        }

        // Fallback: simple line connecting waypoints
        const route: Coordinate[] = [pickupLocation.coordinate];

        if (stop1Coord) {
            route.push(stop1Coord);
        }
        if (stop2Coord) {
            route.push(stop2Coord);
        }
        if (destinationCoord) {
            route.push(destinationCoord);
        }

        return route;
    };

    const handleSelectDestination = async (item: AddressSuggestion) => {
        if (item.isCurrentLocation) {
            setDestinationInput(item.label);
            setSelectedDestination(item.label);
            if (typeof item.latitude === "number" && typeof item.longitude === "number") {
                setDestinationCoord({ latitude: item.latitude, longitude: item.longitude });
            }
        } else if (item.placeId) {
            const details = await resolveGooglePlaceDetails(item.placeId);
            const address = details?.formattedAddress || item.label;
            setDestinationInput(address);
            setSelectedDestination(address);
            if (details) {
                setDestinationCoord({ latitude: details.latitude, longitude: details.longitude });
            }
        } else {
            const nextLabel = await resolveSuggestionLabel(item);
            setDestinationInput(nextLabel);
            setSelectedDestination(nextLabel);
            if (typeof item.latitude === "number" && typeof item.longitude === "number") {
                setDestinationCoord({ latitude: item.latitude, longitude: item.longitude });
            }
        }
        setShowDestinationSuggestions(false);
    };

    const handleEstimateRoute = async () => {
        if (!selectedDestination || !destinationCoord || !routeEstimate) {
            setErrorMessage("Không thể ước tính tuyến đường");
            return;
        }

        setErrorMessage(undefined);

        try {
            const stopEntries: StopEntry[] = [
                { address: stop1Input, coordinate: stop1Coord },
                { address: stop2Input, coordinate: stop2Coord },
            ].filter((item) => item.address.trim().length > 0);

            const stopAddresses = stopEntries.map((item) => item.address);

            setLocationDraft({
                pickupAddress: pickupLocation.address,
                destinationAddress: selectedDestination,
                stopAddresses,
                isScheduled: false,
                currentLocation: location.data
                    ? {
                        latitude: location.data.latitude,
                        longitude: location.data.longitude,
                    }
                    : undefined,
                routeEstimate,
            });

            navigation.navigate("RideVehicleSelection");
        } catch (error) {
            setErrorMessage(getRideFlowErrorMessage(error));
        }
    };

    if (Platform.OS === "web") {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
                <AppHeader title="Chọn điểm đến" />
                <Text style={[styles.webPlaceholder, { color: theme.colors.text }]}>
                    Map không khả dụng trên web
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
            <AppHeader title="Chọn điểm đến" />

            <View style={styles.container}>
                {/* Address Panel */}
                <View style={styles.addressPanel}>
                    <ScrollView
                        contentContainerStyle={styles.addressContent}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                    >
                        {/* Pickup Summary */}
                        <View style={[styles.pickupSummary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
                                Điểm đón đã chọn
                            </Text>
                            <Text style={[styles.summaryAddress, { color: theme.colors.text }]}>
                                {pickupLocation.address}
                            </Text>
                        </View>

                        {/* Destination Input */}
                        <View style={styles.inputSection}>
                            <TextField
                                label="Điểm đến"
                                value={destinationInput}
                                onChangeText={(text) => {
                                    setShowDestinationSuggestions(true);
                                    setDestinationInput(text);
                                    if (text.length === 0) {
                                        handleClearDestination();
                                    }
                                }}
                                placeholder="Nhập điểm đến"
                                selectTextOnFocus
                                keyboardType="default"
                                returnKeyType="search"
                            />

                            {destinationInput && (
                                <Pressable onPress={handleClearDestination} style={styles.clearButton}>
                                    <Text style={[styles.clearButtonText, { color: theme.colors.primary }]}>
                                        Xóa
                                    </Text>
                                </Pressable>
                            )}
                        </View>

                        {destAutocomplete.loading && (
                            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                                Đang tải gợi ý địa chỉ...
                            </Text>
                        )}

                        {!destAutocomplete.loading &&
                            showDestinationSuggestions &&
                            destinationInput.trim().length >= 2 &&
                            destAutocomplete.suggestions.filter((s) => !s.isCurrentLocation).length === 0 && (
                                <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                                    Không tìm thấy gợi ý phù hợp
                                </Text>
                            )}

                        {showDestinationSuggestions && destAutocomplete.suggestions.length > 0 && (
                            <View
                                style={[
                                    styles.suggestionList,
                                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                                ]}
                            >
                                {destAutocomplete.suggestions.map((item, index) => (
                                    <Pressable
                                        key={item.id}
                                        onPress={() => handleSelectDestination(item)}
                                        style={[
                                            styles.suggestionItem,
                                            index === destAutocomplete.suggestions.length - 1
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

                        {/* Optional Stops Toggle */}
                        <Pressable
                            onPress={() => setShowStopsToggle(!showStopsToggle)}
                            style={[
                                styles.toggleButton,
                                { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                            ]}
                        >
                            <Text style={[styles.toggleButtonText, { color: theme.colors.primary }]}>
                                {showStopsToggle ? "Ẩn" : "Thêm"} điểm dừng
                            </Text>
                        </Pressable>

                        {/* Stops Section - Only shown if toggled on */}
                        {showStopsToggle && (
                            <>
                                {/* Stop 1 */}
                                <View style={styles.inputSection}>
                                    <TextField
                                        label="Điểm dừng 1 (tùy chọn)"
                                        value={stop1Input}
                                        onChangeText={(text) => {
                                            setShowStop1Suggestions(true);
                                            setStop1Input(text);
                                            if (text.length === 0) {
                                                setStop1Coord(undefined);
                                            }
                                        }}
                                        placeholder="Thêm điểm dừng"
                                        selectTextOnFocus
                                    />

                                    {stop1Input && (
                                        <Pressable
                                            onPress={() => {
                                                setStop1Input("");
                                                setStop1Coord(undefined);
                                            }}
                                            style={styles.clearButton}
                                        >
                                            <Text style={[styles.clearButtonText, { color: theme.colors.primary }]}>
                                                Xóa
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>

                                {stop1Autocomplete.loading && (
                                    <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                                        Đang tải gợi ý...
                                    </Text>
                                )}

                                {showStop1Suggestions && stop1Autocomplete.suggestions.length > 0 && (
                                    <View
                                        style={[
                                            styles.suggestionList,
                                            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                                        ]}
                                    >
                                        {stop1Autocomplete.suggestions.map((item, index) => (
                                            <Pressable
                                                key={item.id}
                                                onPress={async () => {
                                                    if (item.placeId) {
                                                        const details = await resolveGooglePlaceDetails(item.placeId);
                                                        setStop1Input(details?.formattedAddress || item.label);
                                                        if (details) setStop1Coord({ latitude: details.latitude, longitude: details.longitude });
                                                    } else {
                                                        const nextLabel = await resolveSuggestionLabel(item);
                                                        setStop1Input(nextLabel);
                                                        if (typeof item.latitude === "number" && typeof item.longitude === "number") {
                                                            setStop1Coord({ latitude: item.latitude, longitude: item.longitude });
                                                        }
                                                    }
                                                    setShowStop1Suggestions(false);
                                                }}
                                                style={[
                                                    styles.suggestionItem,
                                                    index === stop1Autocomplete.suggestions.length - 1
                                                        ? styles.suggestionItemLast
                                                        : null,
                                                    { borderBottomColor: theme.colors.border },
                                                ]}
                                            >
                                                <Text
                                                    style={[styles.suggestionText, { color: theme.colors.text }]}
                                                    numberOfLines={1}
                                                >
                                                    {item.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}

                                {/* Stop 2 */}
                                <View style={styles.inputSection}>
                                    <TextField
                                        label="Điểm dừng 2 (tùy chọn)"
                                        value={stop2Input}
                                        onChangeText={(text) => {
                                            setShowStop2Suggestions(true);
                                            setStop2Input(text);
                                            if (text.length === 0) {
                                                setStop2Coord(undefined);
                                            }
                                        }}
                                        placeholder="Tối đa 2 điểm dừng"
                                        selectTextOnFocus
                                    />

                                    {stop2Input && (
                                        <Pressable
                                            onPress={() => {
                                                setStop2Input("");
                                                setStop2Coord(undefined);
                                            }}
                                            style={styles.clearButton}
                                        >
                                            <Text style={[styles.clearButtonText, { color: theme.colors.primary }]}>
                                                Xóa
                                            </Text>
                                        </Pressable>
                                    )}
                                </View>

                                {stop2Autocomplete.loading && (
                                    <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                                        Đang tải gợi ý...
                                    </Text>
                                )}

                                {showStop2Suggestions && stop2Autocomplete.suggestions.length > 0 && (
                                    <View
                                        style={[
                                            styles.suggestionList,
                                            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                                        ]}
                                    >
                                        {stop2Autocomplete.suggestions.map((item, index) => (
                                            <Pressable
                                                key={item.id}
                                                onPress={async () => {
                                                    if (item.placeId) {
                                                        const details = await resolveGooglePlaceDetails(item.placeId);
                                                        setStop2Input(details?.formattedAddress || item.label);
                                                        if (details) setStop2Coord({ latitude: details.latitude, longitude: details.longitude });
                                                    } else {
                                                        const nextLabel = await resolveSuggestionLabel(item);
                                                        setStop2Input(nextLabel);
                                                        if (typeof item.latitude === "number" && typeof item.longitude === "number") {
                                                            setStop2Coord({ latitude: item.latitude, longitude: item.longitude });
                                                        }
                                                    }
                                                    setShowStop2Suggestions(false);
                                                }}
                                                style={[
                                                    styles.suggestionItem,
                                                    index === stop2Autocomplete.suggestions.length - 1
                                                        ? styles.suggestionItemLast
                                                        : null,
                                                    { borderBottomColor: theme.colors.border },
                                                ]}
                                            >
                                                <Text
                                                    style={[styles.suggestionText, { color: theme.colors.text }]}
                                                    numberOfLines={1}
                                                >
                                                    {item.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}

                        <AuthErrorNotice message={errorMessage} />
                    </ScrollView>
                </View>

                {/* Map - Shows route from pickup to destination */}
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        latitude: pickupLocation.coordinate.latitude,
                        longitude: pickupLocation.coordinate.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    onPress={(e) => {
                        setDestinationCoord(e.nativeEvent.coordinate);
                    }}
                >
                    {/* Pickup Marker */}
                    <Marker
                        coordinate={pickupLocation.coordinate}
                        title="Điểm đón"
                        pinColor="green"
                    />

                    {/* Destination Marker */}
                    {destinationCoord && (
                        <Marker coordinate={destinationCoord} title={selectedDestination || "Điểm đến"} />
                    )}

                    {/* Stop Markers */}
                    {stop1Coord && <Marker coordinate={stop1Coord} title="Điểm dừng 1" pinColor="orange" />}
                    {stop2Coord && <Marker coordinate={stop2Coord} title="Điểm dừng 2" pinColor="orange" />}

                    {/* Route Polyline - Shows path from pickup through stops to destination */}
                    {destinationCoord && (
                        <Polyline
                            coordinates={buildRouteCoordinates()}
                            strokeColor="#2196F3"
                            strokeWidth={3}
                            geodesic
                        />
                    )}
                </MapView>

                {/* Button at Bottom */}
                <View style={[styles.buttonContainer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
                    <PrimaryButton
                        title="Tiếp tục"
                        onPress={handleEstimateRoute}
                        disabled={!selectedDestination || !destinationCoord || !routeEstimate}
                        loading={routeMutation.isPending}
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
        maxHeight: "45%",
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    addressContent: {
        padding: 16,
        gap: 12,
    },
    pickupSummary: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        gap: 4,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: "500",
    },
    summaryAddress: {
        fontSize: 13,
        fontWeight: "600",
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
    toggleButton: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 10,
        alignItems: "center",
    },
    toggleButtonText: {
        fontSize: 13,
        fontWeight: "600",
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
