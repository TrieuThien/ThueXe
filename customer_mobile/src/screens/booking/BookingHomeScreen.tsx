import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppHeader,
  EmptyState,
  ErrorState,
  HomeSectionHeader,
  LoadingState,
  RecentRouteCard,
} from "../../components";
import { useHomeOverviewQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useBookingDraftStore, useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { RecentRoute } from "../../types";

type Props = NativeStackScreenProps<BookingStackParamList, "BookingHome">;

export function BookingHomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const homeQuery = useHomeOverviewQuery();
  const setRideType = useBookingDraftStore((state) => state.setRideType);
  const setLocations = useBookingDraftStore((state) => state.setLocations);
  const setServiceType = useRentalFlowStore((state) => state.setServiceType);

  const handleRecentRoutePress = (route: RecentRoute) => {
    setRideType(route.rideType);
    setLocations(route.pickupAddress, route.destinationAddress);

    if (route.rideType === "CALL_RIDE") {
      navigation.navigate("RideLocationPickup");
      return;
    }

    navigation.navigate("RentalServiceChooser");
  };

  const recentRoutes = homeQuery.data?.recentRoutes ?? [];
  const quickActions: Array<{
    id: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }> = [
      {
        id: "book-now",
        title: "Đặt xe ngay",
        icon: "car-sport-outline",
        onPress: () => navigation.navigate("RideLocationPickup"),
      },
      {
        id: "rental-car",
        title: "Thuê xe",
        icon: "car-outline",
        onPress: () => {
          setServiceType("RENTAL_CAR");
          navigation.navigate("RentalBookingForm");
        },
      },
      {
        id: "rental-driver",
        title: "Thuê tài xế",
        icon: "person-outline",
        onPress: () => {
          setServiceType("RENTAL_DRIVER");
          navigation.navigate("RentalBookingForm");
        },
      },
      {
        id: "rental-car-with-driver",
        title: "Thuê xe kèm tài xế",
        icon: "people-outline",
        onPress: () =>
          Alert.alert("Sắp ra mắt", "Chức năng thuê xe kèm tài xế đang được phát triển và sẽ sớm ra mắt."),
      },
      {
        id: "active-trip",
        title: "Chuyến hiện tại",
        icon: "navigate-outline",
        onPress: () => navigation.navigate("ActiveTrip"),
      },
    ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Đặt xe" />
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Bắt đầu đặt xe di chuyển</Text>
        <Text style={[styles.description, { color: theme.colors.textMuted }]}>Nhập điểm đón/điểm đến, chọn xe, áp dụng mã giảm giá và theo dõi quá trình tìm tài xế theo thời gian thực.</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              onPress={action.onPress}
              style={[
                styles.actionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Ionicons name={action.icon} size={24} color={theme.colors.primary} />
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{action.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <HomeSectionHeader title="Lịch sử gần đây" />
        {homeQuery.isLoading ? <LoadingState /> : null}
        {homeQuery.isError ? <ErrorState onRetry={homeQuery.refetch} /> : null}
        {!homeQuery.isLoading && !homeQuery.isError && recentRoutes.length === 0 ? (
          <EmptyState title="Chưa có lịch sử" description="Các lộ trình đã đi sẽ hiện ở đây." />
        ) : null}
        {!homeQuery.isLoading && !homeQuery.isError && recentRoutes.length > 0 ? (
          <View style={styles.recentList}>
            {recentRoutes.map((route) => (
              <RecentRouteCard key={route.id} item={route} onPress={handleRecentRoutePress} />
            ))}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  section: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recentList: {
    gap: 8,
  },
  container: {
    padding: 16,
    gap: 14,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
