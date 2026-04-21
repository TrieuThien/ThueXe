/**
 * RentalPackageCarsScreen
 * Hiển thị danh sách xe khả dụng thuộc gói thuê mà người dùng đã chọn.
 * Người dùng có thể nhấn "Thuê ngay" để tiếp tục flow đặt xe hiện tại.
 */
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, EmptyState, ErrorState, LoadingState } from "../../components";
import { usePackageCarsQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";
import type { PackageCar } from "../../services/api/modules/rentalApi";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalPackageCars">;

// ── Helpers ────────────────────────────────────────────────────────────────────

function fuelLabel(fuel: string) {
  const map: Record<string, string> = {
    petrol: "Xăng",
    diesel: "Dầu",
    electric: "Điện",
    hybrid: "Hybrid",
  };
  return map[fuel] ?? fuel;
}

function transmissionLabel(t: string) {
  return t === "auto" ? "Số tự động" : "Số sàn";
}

function StarRating({ rating }: { rating: number | null }) {
  const { theme } = useTheme();
  if (rating === null) {
    return <Text style={[styles.noRating, { color: theme.colors.textMuted }]}>Chưa có đánh giá</Text>;
  }
  return (
    <Text style={[styles.rating, { color: theme.colors.warning ?? "#f59e0b" }]}>
      ★ {rating.toFixed(1)}
    </Text>
  );
}

// ── Car Card ───────────────────────────────────────────────────────────────────

interface CarCardProps {
  car: PackageCar;
  onSelect: () => void;
}

function CarCard({ car, onSelect }: CarCardProps) {
  const { theme } = useTheme();
  const vehicleName = [car.brand, car.model, car.year].filter(Boolean).join(" ");

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Tên xe + biển số */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.vehicleName, { color: theme.colors.text }]} numberOfLines={1}>
            {vehicleName || "Xe không tên"}
          </Text>
          <Text style={[styles.licensePlate, { color: theme.colors.textMuted }]}>
            {car.license_plate}
          </Text>
        </View>
        <StarRating rating={car.avg_rating} />
      </View>

      {/* Thông tin xe */}
      <View style={styles.infoRow}>
        <InfoChip label={`${car.seat_count} chỗ`} color="#6366f1" />
        <InfoChip label={fuelLabel(car.fuel_type)} color="#0ea5e9" />
        <InfoChip label={transmissionLabel(car.transmission)} color="#10b981" />
      </View>

      {/* Chủ xe */}
      {car.owner_name ? (
        <Text style={[styles.ownerText, { color: theme.colors.textMuted }]}>
          Chủ xe: {car.owner_name}
        </Text>
      ) : null}

      {/* Nút Thuê ngay */}
      <TouchableOpacity
        style={[styles.hireBtn, { backgroundColor: theme.colors.primary ?? "#2563eb" }]}
        onPress={onSelect}
        activeOpacity={0.8}
      >
        <Text style={styles.hireBtnText}>Thuê ngay</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + "18", borderColor: color + "40" }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function RentalPackageCarsScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { packageId, packageName } = route.params;

  const setSelectedPackage = useRentalFlowStore((state) => state.setSelectedPackage);
  const query = usePackageCarsQuery(packageId);

  const cars: PackageCar[] = Array.isArray(query.data?.cars) ? query.data.cars : [];

  /**
   * Khi người dùng chọn xe:
   * 1. Set gói thuê vào flow store (giống flow hiện tại khi chọn từ RentalPackageList)
   * 2. Điều hướng đến màn hình xác nhận đặt xe
   */
  function handleSelectCar(car: PackageCar) {
    // Lưu package đã chọn vào store (RentalBookingForm cần package_id)
    setSelectedPackage({
      packageId,
      packageName,
      // Các field khác của package sẽ được load lại ở RentalBookingForm
    } as any);

    // Điều hướng về form đặt xe với vehicle_id đã chọn sẵn
    navigation.navigate("RentalBookingForm");
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={packageName || "Danh sách xe"} onBack={() => navigation.goBack()} />

      {query.isLoading ? (
        <LoadingState message="Đang tải danh sách xe..." />
      ) : query.isError ? (
        <ErrorState description="Không tải được danh sách xe" onRetry={query.refetch} />
      ) : cars.length === 0 ? (
        <EmptyState
          title="Chưa có xe khả dụng"
          description="Gói thuê này hiện chưa có xe nào đăng ký hoặc tất cả xe đang bận."
        />
      ) : (
        <FlatList
          data={cars}
          keyExtractor={(item) => String(item.vehicle_id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CarCard car={item} onSelect={() => handleSelectCar(item)} />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: theme.colors.text }]}>
                {cars.length} xe khả dụng
              </Text>
              <Text style={[styles.listSub, { color: theme.colors.textMuted }]}>
                Gói: {packageName}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { padding: 16, paddingBottom: 32, gap: 12 },
  listHeader: { marginBottom: 4 },
  listTitle: { fontSize: 18, fontWeight: "800" },
  listSub: { fontSize: 13, marginTop: 2 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitleRow: { flex: 1 },
  vehicleName: { fontSize: 15, fontWeight: "700" },
  licensePlate: { fontSize: 12, marginTop: 2 },

  rating: { fontSize: 14, fontWeight: "700" },
  noRating: { fontSize: 12 },

  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: "600" },

  ownerText: { fontSize: 12 },

  hireBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 4,
  },
  hireBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
