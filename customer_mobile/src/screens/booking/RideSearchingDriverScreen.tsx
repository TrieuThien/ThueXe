import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, ErrorState, LoadingState, PrimaryButton } from "../../components";
import {
  getRideFlowErrorMessage,
  useDriverAllocationStatusQuery,
  useRetryDriverAllocationMutation,
} from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { trackingService } from "../../services/trackingService";
import { useRideFlowStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "RideSearchingDriver">;

export function RideSearchingDriverScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const resetRideFlow = useRideFlowStore((state) => state.resetRideFlow);
  const pickupCoordinate = useRideFlowStore((state) => state.routeEstimate?.pickup?.coordinate);
  const statusQuery = useDriverAllocationStatusQuery(route.params.bookingId);
  const retryMutation = useRetryDriverAllocationMutation();

  const allocation = statusQuery.data;
  const isAllocated = allocation?.allocationStatus === "ALLOCATED";

  const driverLocationQuery = useQuery({
    queryKey: ["driver-location", route.params.bookingId],
    queryFn: () => trackingService.getDriverLocation(route.params.bookingId),
    enabled: isAllocated,
    refetchInterval: 5000,
  });

  const renderMap = () => {
    if (!pickupCoordinate) return null;

    if (Platform.OS === "web") {
      return (
        <View style={[styles.mapWrap, styles.webFallback]}>
          <Text style={[styles.webText, { color: theme.colors.textMuted }]}>
            Điểm đón: {pickupCoordinate.latitude.toFixed(5)}, {pickupCoordinate.longitude.toFixed(5)}
          </Text>
        </View>
      );
    }

    const maps = require("react-native-maps") as { default: any; Marker: any };
    const MapView = maps.default;
    const Marker = maps.Marker;

    const driverLoc = driverLocationQuery.data;
    const region = {
      latitude: pickupCoordinate.latitude,
      longitude: pickupCoordinate.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

    return (
      <View style={styles.mapWrap}>
        <MapView style={styles.map} initialRegion={region}>
          <Marker
            coordinate={{ latitude: pickupCoordinate.latitude, longitude: pickupCoordinate.longitude }}
            title="Điểm đón"
            pinColor="green"
          />
          {driverLoc && driverLoc.location.lat !== 0 ? (
            <Marker
              coordinate={{ latitude: driverLoc.location.lat, longitude: driverLoc.location.lng }}
              title="Tài xế"
              pinColor="blue"
            />
          ) : null}
        </MapView>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Đang tìm tài xế" />
      {renderMap()}
      <ScrollView contentContainerStyle={styles.container}>
        {statusQuery.isLoading ? <LoadingState message="Đang tìm tài xế gần bạn..." /> : null}
        {statusQuery.isError ? (
          <ErrorState
            description={getRideFlowErrorMessage(statusQuery.error)}
            onRetry={statusQuery.refetch}
          />
        ) : null}

        {allocation?.allocationStatus === "SEARCHING" ? (
          <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.title, { color: theme.colors.text }]}>Hệ thống đang tìm tài xế phù hợp...</Text>
            <Text style={[styles.desc, { color: theme.colors.textMuted }]}>Vui lòng chờ trong giây lát.</Text>
          </View>
        ) : null}

        {allocation?.allocationStatus === "FAILED" ? (
          <ErrorState
            title="Chưa tìm được tài xế"
            description={allocation.reason ?? "Vui lòng thử lại sau ít phút."}
            actionLabel="Tìm lại"
            onRetry={async () => {
              await retryMutation.mutateAsync(route.params.bookingId);
              await statusQuery.refetch();
            }}
          />
        ) : null}

        {allocation?.allocationStatus === "ALLOCATED" ? (
          <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
            <Text style={[styles.title, { color: theme.colors.text }]}>Đã tìm được tài xế</Text>
            <Text style={[styles.desc, { color: theme.colors.textMuted }]}>
              {allocation.driverName} - {allocation.driverPhone}
            </Text>
            <Text style={[styles.desc, { color: theme.colors.textMuted }]}>
              Xe {allocation.vehiclePlate} - Đón sau {allocation.etaPickupMinutes} phút
            </Text>
            <PrimaryButton
              title="Xem booking"
              onPress={() => {
                resetRideFlow();
                navigation.replace("BookingDetail", { bookingId: route.params.bookingId });
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mapWrap: {
    height: 220,
    width: "100%",
  },
  map: {
    flex: 1,
  },
  webFallback: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
  },
  webText: {
    fontSize: 13,
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  desc: {
    fontSize: 14,
  },
});
