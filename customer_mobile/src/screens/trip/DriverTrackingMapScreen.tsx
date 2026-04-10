import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RefreshControl, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, ErrorState, LoadingState, TripStatusBadge } from "../../components";
import { useDriverTrackingQuery, useTripDetailQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "DriverTrackingMap">;

export function DriverTrackingMapScreen({ route }: Props) {
  const { theme } = useTheme();
  const detailQuery = useTripDetailQuery(route.params.bookingId);
  const trackingQuery = useDriverTrackingQuery(route.params.bookingId, Boolean(detailQuery.data?.driver));

  const driverLocation = trackingQuery.data?.driverLocation;

  const renderMap = () => {
    if (!driverLocation) {
      return <Text style={[styles.noLocation, { color: theme.colors.textMuted }]}>Chưa có vị trí tài xế.</Text>;
    }

    if (Platform.OS === "web") {
      return (
        <View style={[styles.mapWrap, styles.webFallback]}>
          <Text style={styles.webTitle}>Bản đồ native không hỗ trợ trên web preview.</Text>
          <Text style={styles.webLine}>
            Tài xế: {driverLocation.location.lat.toFixed(5)}, {driverLocation.location.lng.toFixed(5)}
          </Text>
          <Text style={styles.webLine}>Tốc độ: {driverLocation.speedKmh} km/h</Text>
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

    return (
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: driverLocation.location.lat,
            longitude: driverLocation.location.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker
            coordinate={{ latitude: driverLocation.location.lat, longitude: driverLocation.location.lng }}
            title="Tài xế"
            description={`Tốc độ ${driverLocation.speedKmh} km/h`}
          />
        </MapView>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Theo dõi tài xế" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={trackingQuery.isRefetching} onRefresh={trackingQuery.refetch} />}
      >
        {detailQuery.data ? <TripStatusBadge status={detailQuery.data.status} /> : null}

        {trackingQuery.isLoading ? <LoadingState message="Đang cập nhật vị trí tài xế..." /> : null}
        {trackingQuery.isError ? <ErrorState description="Không tải được vị trí tài xế" onRetry={trackingQuery.refetch} /> : null}

        {renderMap()}

        {trackingQuery.data?.etaMinutes !== undefined ? (
          <Text style={[styles.eta, { color: theme.colors.primary }]}>Thời gian ước tính đến điểm đón: {trackingQuery.data.etaMinutes} phút</Text>
        ) : null}
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
  mapWrap: {
    height: 360,
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  webFallback: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 16,
    padding: 12,
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
  },
  webTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  webLine: {
    fontSize: 12,
    color: "#475569",
  },
  noLocation: {
    fontSize: 13,
    textAlign: "center",
  },
  eta: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
});
