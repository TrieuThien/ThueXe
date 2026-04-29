/**
 * RentalPackageListScreen
 * Hiển thị danh sách gói thuê theo điểm đón được chọn (GIS filter).
 *
 * Flow:
 *  1. Ưu tiên pickupCoordinate từ criteria (điểm đón người dùng đã chọn)
 *  2. Fallback: xin quyền GPS → lấy lat/lng hiện tại
 *  3. Gọi GET /api/mobile/rental-packages/nearby?lat=&lng=
 *  4. Hiển thị danh sách gói phù hợp
 *  5. Chọn gói → đến RentalPackageCars để xem xe
 */
import { useCallback, useEffect } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppHeader,
  EmptyState,
  ErrorState,
  HeaderTextButton,
  LoadingState,
} from "../../components";
import { useCurrentLocation, useNearbyPackagesQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";

const SERVICE_TYPE_MAP: Record<string, 1 | 2 | 3> = {
  RENTAL_CAR: 1,
  RENTAL_DRIVER: 2,
  RENTAL_CAR_WITH_DRIVER: 3,
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  RENTAL_CAR: "Gói thuê xe",
  RENTAL_DRIVER: "Gói thuê tài xế",
  RENTAL_CAR_WITH_DRIVER: "Gói thuê xe kèm tài xế",
};

const SERVICE_TYPE_BTN: Record<string, string> = {
  RENTAL_CAR: "Xem xe →",
  RENTAL_DRIVER: "Xem gói →",
  RENTAL_CAR_WITH_DRIVER: "Xem xe →",
};

type Props = NativeStackScreenProps<BookingStackParamList, "RentalPackageList">;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

// ── Package Card ───────────────────────────────────────────────────────────────

interface NearbyPackage {
  package_id: number;
  package_name: string;
  price: number;
  description: string | null;
  service_type: number;
  coverage_type: string | null;
  distance_km: number | null;
  duration_hours: number | null;
  duration_days: number | null;
  distance_limit_km: number;
}

interface PackageCardProps {
  item: NearbyPackage;
  btnLabel: string;
  onPress: () => void;
}

function PackageCard({ item, btnLabel, onPress }: PackageCardProps) {
  const { theme } = useTheme();

  const durationText = [
    item.duration_hours ? `${item.duration_hours} giờ` : null,
    item.duration_days ? `${item.duration_days} ngày` : null,
  ].filter(Boolean).join(" / ") || null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.packageName, { color: theme.colors.text }]} numberOfLines={1}>
        {item.package_name}
      </Text>

      {item.description ? (
        <Text style={[styles.description, { color: theme.colors.textMuted }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {durationText ? (
          <View style={styles.metaChip}>
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>⏱ {durationText}</Text>
          </View>
        ) : null}
        {item.distance_limit_km > 0 ? (
          <View style={styles.metaChip}>
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              🚗 {item.distance_limit_km} km
            </Text>
          </View>
        ) : null}
        {item.distance_km !== null ? (
          <View style={styles.metaChip}>
            <Text style={[styles.metaText, { color: theme.colors.primary ?? "#2563eb" }]}>
              📍 Cách {item.distance_km} km
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.price, { color: theme.colors.primary ?? "#2563eb" }]}>
          {formatVnd(item.price)}
        </Text>
        <View style={[styles.viewBtn, { backgroundColor: (theme.colors.primary ?? "#2563eb") + "18" }]}>
          <Text style={[styles.viewBtnText, { color: theme.colors.primary ?? "#2563eb" }]}>
            {btnLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function RentalPackageListScreen({ navigation }: Props) {
  const { theme } = useTheme();

  const selectedServiceType = useRentalFlowStore((s) => s.selectedServiceType);
  const criteria = useRentalFlowStore((s) => s.criteria);
  const numericServiceType = selectedServiceType ? SERVICE_TYPE_MAP[selectedServiceType] : undefined;
  const screenTitle = selectedServiceType ? SERVICE_TYPE_LABEL[selectedServiceType] : "Gói thuê gần bạn";
  const btnLabel = selectedServiceType ? SERVICE_TYPE_BTN[selectedServiceType] : "Xem xe →";

  // Ưu tiên dùng pickupCoordinate từ criteria (điểm đón đã chọn), fallback GPS
  const pickupCoord = criteria?.pickupCoordinate;
  const hasPickupCoord =
    pickupCoord &&
    Number.isFinite(pickupCoord.latitude) &&
    Number.isFinite(pickupCoord.longitude);

  // Chỉ kích hoạt GPS nếu không có điểm đón
  const location = useCurrentLocation(!hasPickupCoord);

  const locationParams = hasPickupCoord
    ? { lat: pickupCoord.latitude, lng: pickupCoord.longitude, service_type: numericServiceType }
    : location.data && Number.isFinite(location.data.latitude) && Number.isFinite(location.data.longitude)
      ? { lat: location.data.latitude, lng: location.data.longitude, service_type: numericServiceType }
      : null;

  const query = useNearbyPackagesQuery(locationParams);

  useEffect(() => {
    if (query.isError && query.error) {
      console.error("[RentalPackageList] Query error:", query.error);
    }
  }, [query.isError, query.error]);

  const items: NearbyPackage[] = Array.isArray((query.data as any)?.items) ? (query.data as any).items : [];

  const onRefresh = useCallback(() => {
    if (!hasPickupCoord) location.fetchLocation();
    query.refetch();
  }, [hasPickupCoord, location, query]);

  // Chỉ chặn màn hình chờ GPS khi không có điểm đón từ criteria
  if (!hasPickupCoord && location.loading && !location.data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppHeader title={screenTitle} leftAction={<HeaderTextButton label="Quay lại" onPress={() => navigation.goBack()} />} />
        <LoadingState message="Đang lấy vị trí của bạn..." />
      </SafeAreaView>
    );
  }

  if (!hasPickupCoord && location.error && !location.data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppHeader title={screenTitle} leftAction={<HeaderTextButton label="Quay lại" onPress={() => navigation.goBack()} />} />
        <ErrorState
          description="Không lấy được vị trí. Vui lòng cấp quyền truy cập vị trí và thử lại."
          onRetry={location.fetchLocation}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={screenTitle} leftAction={<HeaderTextButton label="Quay lại" onPress={() => navigation.goBack()} />} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {(criteria?.pickupAddress || location.data?.address) ? (
          <View style={[styles.locationBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.locationLabel, { color: theme.colors.textMuted }]}>
              {criteria?.pickupAddress ? "📍 Điểm đón" : "📍 Vị trí của bạn"}
            </Text>
            <Text style={[styles.locationAddress, { color: theme.colors.text }]} numberOfLines={1}>
              {criteria?.pickupAddress || location.data?.address}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.title, { color: theme.colors.text }]}>Gói thuê phù hợp</Text>

        {query.isLoading ? <LoadingState message="Đang tìm gói thuê..." /> : null}

        {query.isError && !query.isLoading ? (
          <ErrorState
            description={query.error?.message || "Không tải được danh sách gói thuê. Vui lòng kiểm tra kết nối mạng và thử lại."}
            onRetry={query.refetch}
          />
        ) : null}

        {!query.isLoading && !query.isError && items.length === 0 ? (
          <EmptyState
            title="Không có gói thuê nào"
            description="Hiện chưa có gói thuê nào áp dụng cho khu vực của bạn. Vui lòng thử lại sau."
          />
        ) : null}

        {items.map((pkg) => (
          <PackageCard
            key={pkg.package_id}
            item={pkg}
            btnLabel={btnLabel}
            onPress={() =>
              navigation.navigate("RentalPackageCars", {
                packageId: pkg.package_id,
                packageName: pkg.package_name,
                packageBasePrice: pkg.price,
                packageDurationHours: pkg.duration_hours ?? undefined,
              })
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  locationBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 2,
  },
  locationLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  locationAddress: { fontSize: 13, fontWeight: "500" },

  title: { fontSize: 19, fontWeight: "800", marginTop: 4 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  packageName: { fontSize: 16, fontWeight: "700" },
  description: { fontSize: 13, lineHeight: 18 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  metaText: { fontSize: 12 },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  price: { fontSize: 18, fontWeight: "800" },
  viewBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  viewBtnText: { fontSize: 13, fontWeight: "700" },
});
