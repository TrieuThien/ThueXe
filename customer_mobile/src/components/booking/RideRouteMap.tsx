import { StyleSheet, Text, View, Platform } from "react-native";

import { Coordinate } from "../../types";

interface RideRouteMapProps {
  pickup: Coordinate;
  destination: Coordinate;
  stops?: Coordinate[];
  polylineCoordinates: Coordinate[];
}

export function RideRouteMap({ pickup, destination, stops = [], polylineCoordinates }: RideRouteMapProps) {
  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, styles.webFallback]}>
        <Text style={styles.webTitle}>Bản đồ không hỗ trợ trên web preview.</Text>
        <Text style={styles.webLine}>
          Điểm đón: {pickup.latitude.toFixed(4)}, {pickup.longitude.toFixed(4)}
        </Text>
        <Text style={styles.webLine}>
          Điểm đến: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
        </Text>
        <Text style={styles.webLine}>
          Số điểm dừng: {stops.length} | Số điểm polyline: {polylineCoordinates.length}
        </Text>
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require("react-native-maps") as {
    default: any;
    Marker: any;
    Polyline: any;
  };
  const MapView = maps.default;
  const Marker = maps.Marker;
  const Polyline = maps.Polyline;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        <Marker coordinate={pickup} title="Điểm đón" pinColor="#16A34A" />
        {stops.map((stop, index) => (
          <Marker key={index} coordinate={stop} title={`Điểm dừng ${index + 1}`} pinColor="#F59E0B" />
        ))}
        <Marker coordinate={destination} title="Điểm đến" pinColor="#DC2626" />
        <Polyline coordinates={polylineCoordinates} strokeWidth={4} strokeColor="#0A84FF" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  webFallback: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
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
});
