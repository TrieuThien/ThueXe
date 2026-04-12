import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppHeader,
  DestinationSearchCard,
  EmptyState,
  ErrorState,
  FeaturedCouponCard,
  HomeBannerList,
  HomeSectionHeader,
  HomeServiceCard,
  LoadingState,
  QuickDestinationList,
  RecentRouteCard,
} from "../../components";
import { SERVICE_TYPE_OPTIONS } from "../../constants";
import { useCurrentLocation, useHomeOverviewQuery } from "../../hooks";
import { MainTabParamList } from "../../navigation";
import { useAuthStore, useBookingDraftStore, useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { FeaturedCoupon, HomeBanner, QuickDestination, RecentRoute, RideType } from "../../types";
import { formatCurrencyVND } from "../../utils/format";

type Props = BottomTabScreenProps<MainTabParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setRideType = useBookingDraftStore((state) => state.setRideType);
  const setLocations = useBookingDraftStore((state) => state.setLocations);
  const setRentalServiceType = useRentalFlowStore((state) => state.setServiceType);

  const homeQuery = useHomeOverviewQuery(isAuthenticated);
  const location = useCurrentLocation(true);
  const homeOverview = homeQuery.data ?? {
    currentAddress: "",
    banners: [],
    quickDestinations: [],
    recentRoutes: [],
    popularServices: [],
    featuredCoupons: [],
  };

  const serviceCards = useMemo(() => SERVICE_TYPE_OPTIONS, []);

  const goToLogin = () => {
    const parent = navigation.getParent() as { navigate: (name: string, params?: unknown) => void } | null;
    parent?.navigate("Auth", { screen: "Login" });
  };

  const goBookingFlow = (rideType: RideType, destinationAddress?: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập để sử dụng tính năng đặt xe/thuê xe.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Đăng nhập", onPress: goToLogin },
        ],
      );
      return;
    }

    setRideType(rideType);
    setLocations(location.data?.address ?? "", destinationAddress ?? "");

    if (rideType === "CALL_RIDE") {
      navigation.navigate("Booking", { screen: "RideLocationPicker" });
      return;
    }

    if (rideType === "RENTAL_CAR" || rideType === "RENTAL_DRIVER") {
      setRentalServiceType(rideType);
      navigation.navigate("Booking", { screen: "RentalBookingForm" });
      return;
    }

    navigation.navigate("Booking", { screen: "RentalServiceChooser" });
  };

  const handleBannerPress = (banner: HomeBanner) => {
    if (banner.actionType === "BOOKING" && banner.rideType) {
      goBookingFlow(banner.rideType);
      return;
    }

    Alert.alert("Thông báo", "Khuyến mãi sẽ mở trong phiên bản tiếp theo.");
  };

  const handleRecentRoutePress = (route: RecentRoute) => {
    setLocations(route.pickupAddress, route.destinationAddress);
    goBookingFlow(route.rideType, route.destinationAddress);
  };

  const handleCouponPress = (coupon: FeaturedCoupon) => {
    Alert.alert("Coupon", `Đã lưu mã ${coupon.code}. Bạn có thể áp dụng khi đặt xe.`);
  };

  const handleQuickDestinationPress = (item: QuickDestination) => {
    goBookingFlow("CALL_RIDE", item.address);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Trang chủ" />

      {isAuthenticated && homeQuery.isLoading ? <LoadingState message="Đang tải dữ liệu trang chủ..." /> : null}
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isAuthenticated && homeQuery.isError ? <ErrorState description="Không thể tải dữ liệu trang chủ" onRetry={homeQuery.refetch} /> : null}
          <DestinationSearchCard
            currentAddress={location.data?.address ?? homeOverview.currentAddress}
            isLocating={location.loading}
            locationError={location.error}
            onRefreshLocation={() => {
              void location.fetchLocation();
            }}
            onPressSearch={() => goBookingFlow("CALL_RIDE")}
          />

          <View style={styles.section}>
            <HomeSectionHeader title="Chọn dịch vụ" />
            <View style={styles.servicesGrid}>
              {serviceCards.map((service) => (
                <View key={service.id} style={styles.serviceGridItem}>
                  <HomeServiceCard
                    title={service.title}
                    rideType={service.id}
                    variant="grid"
                    onPress={(rideType) => goBookingFlow(rideType)}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Ưu đãi nổi bật" />
            <HomeBannerList banners={homeOverview.banners} onPressBanner={handleBannerPress} />
          </View>

          

          <View style={styles.section}>
            <HomeSectionHeader title="Điểm đến nhanh" />
            {homeOverview.quickDestinations.length === 0 ? (
              <EmptyState title="Chưa có điểm đến nhanh" description="Thêm điểm đến yêu thích để đặt xe nhanh hơn." />
            ) : (
              <QuickDestinationList destinations={homeOverview.quickDestinations} onPress={handleQuickDestinationPress} />
            )}
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Dịch vụ phổ biến" />
            {homeOverview.popularServices.length === 0 ? (
              <EmptyState title="Chưa có gợi ý" description="Các gợi ý dịch vụ sẽ hiển tại đây." />
            ) : (
              <View style={styles.popularList}>
                {homeOverview.popularServices.map((service) => (
                  <HomeServiceCard
                    key={service.id}
                    title={service.title}
                    subtitle={`${service.description} - Từ ${formatCurrencyVND(service.estimatedFromPrice)}`}
                    rideType={service.rideType}
                    onPress={(rideType) => goBookingFlow(rideType)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Lịch sử gần đây" />
            {homeOverview.recentRoutes.length === 0 ? (
              <EmptyState title="Chưa có lịch sử" description="Các lộ trình đã đi sẽ hiển ở đây." />
            ) : (
              <View style={styles.recentList}>
                {homeOverview.recentRoutes.map((route) => (
                  <RecentRouteCard key={route.id} item={route} onPress={handleRecentRoutePress} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Khuyến mãi dành cho bạn" />
            {homeOverview.featuredCoupons.length === 0 ? (
              <EmptyState title="Không có coupon" description="Coupon mới sẽ được cập nhật sớm." />
            ) : (
              <View style={styles.couponList}>
                {homeOverview.featuredCoupons.map((coupon) => (
                  <FeaturedCouponCard key={coupon.id} coupon={coupon} onPress={handleCouponPress} />
                ))}
              </View>
            )}
          </View>

          <Text style={[styles.footer, { color: theme.colors.textMuted }]}>ThueXe - Di chuyển tiện lợi mỗi ngày</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  serviceGridItem: {
    width: "32%",
    height: 110,
  },
  popularList: {
    gap: 10,
  },
  recentList: {
    gap: 8,
  },
  couponList: {
    gap: 10,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
  },
});
