import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppHeader, HeaderTextButton } from "../../components";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalCarDetail">;

// ── Helpers ────────────────────────────────────────────────────────────────────

const FUEL_LABEL: Record<string, string> = {
  petrol: "Xăng",
  diesel: "Dầu diesel",
  electric: "Điện",
  hybrid: "Hybrid",
};

const TRANSMISSION_LABEL: Record<string, string> = {
  auto: "Số tự động",
  manual: "Số sàn",
};

const FUEL_ICON: Record<string, string> = {
  petrol: "⛽",
  diesel: "🛢️",
  electric: "⚡",
  hybrid: "🔋",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
      {label.toUpperCase()}
    </Text>
  );
}

function SpecCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.specCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={styles.specIcon}>{icon}</Text>
      <Text style={[styles.specValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.specLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function StarRow({ rating, count }: { rating: number | null; count: number }) {
  const { theme } = useTheme();
  if (rating === null) {
    return (
      <Text style={[styles.noRating, { color: theme.colors.textMuted }]}>
        Chưa có đánh giá
      </Text>
    );
  }

  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <View style={styles.starRow}>
      <Text style={[styles.ratingBig, { color: theme.colors.warning ?? "#f59e0b" }]}>
        {rating.toFixed(1)}
      </Text>
      <View style={styles.starsWrap}>
        <Text style={[styles.stars, { color: theme.colors.warning ?? "#f59e0b" }]}>
          {"★".repeat(full)}
          {half ? "½" : ""}
          {"☆".repeat(empty)}
        </Text>
        <Text style={[styles.ratingCount, { color: theme.colors.textMuted }]}>
          {count} đánh giá
        </Text>
      </View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function RentalCarDetailScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { car, packageId, packageName, packageBasePrice, packageDurationHours } = route.params;

  const vehicleName = [car.brand, car.model, car.year].filter(Boolean).join(" ");
  const interiorPhotos = Array.isArray(car.interior_photo_urls) ? car.interior_photo_urls.filter(Boolean) : [];

  function handleRentNow() {
    navigation.navigate("RentalVehicleConfirm", { car, packageId, packageName, packageBasePrice, packageDurationHours });
  }

  function handleCallOwner() {
    if (car.owner_phone) {
      Linking.openURL(`tel:${car.owner_phone}`);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Chi tiết xe"
        leftAction={<HeaderTextButton label="Quay lại" onPress={() => navigation.goBack()} />}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {car.photo_url ? (
            <Image
              source={{ uri: car.photo_url }}
              style={styles.vehiclePhoto}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.vehicleIconWrap, { backgroundColor: (theme.colors.primary ?? "#2563eb") + "12" }]}>
              <Text style={styles.vehicleIcon}>🚗</Text>
            </View>
          )}

          <Text style={[styles.vehicleName, { color: theme.colors.text }]}>
            {vehicleName || "Xe không tên"}
          </Text>

          <View style={styles.badgeRow}>
            <View style={[styles.plateChip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.plateText, { color: theme.colors.text }]}>
                🪪 {car.license_plate}
              </Text>
            </View>

            {car.type_name ? (
              <View style={[styles.typeChip, { backgroundColor: (theme.colors.primary ?? "#2563eb") + "15" }]}>
                <Text style={[styles.typeText, { color: theme.colors.primary ?? "#2563eb" }]}>
                  {car.type_name}
                </Text>
              </View>
            ) : null}

            {car.color ? (
              <View style={[styles.typeChip, { backgroundColor: theme.colors.surfaceMuted ?? "#f1f5f9" }]}>
                <Text style={[styles.typeText, { color: theme.colors.textMuted }]}>
                  🎨 {car.color}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Gói thuê đang áp dụng */}
          <View style={[styles.packageBadge, { backgroundColor: (theme.colors.success ?? "#10b981") + "12", borderColor: (theme.colors.success ?? "#10b981") + "30" }]}>
            <Text style={[styles.packageBadgeText, { color: theme.colors.success ?? "#10b981" }]}>
              📦 {packageName}
            </Text>
          </View>

          {/* Phí vượt km / giờ */}
          {((car.extra_km_fee ?? 0) > 0 || (car.extra_hour_fee ?? 0) > 0) ? (
            <View style={[styles.feeRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              {(car.extra_km_fee ?? 0) > 0 ? (
                <Text style={[styles.feeText, { color: theme.colors.textMuted }]}>
                  {"🛣️"} Vượt km: {new Intl.NumberFormat("vi-VN").format(car.extra_km_fee ?? 0)}₫/km
                </Text>
              ) : null}
              {(car.extra_hour_fee ?? 0) > 0 ? (
                <Text style={[styles.feeText, { color: theme.colors.textMuted }]}>
                  {"⏱️"} Vượt giờ: {new Intl.NumberFormat("vi-VN").format(car.extra_hour_fee ?? 0)}₫/h
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ── Ảnh nội thất ─────────────────────────────────────────────────── */}
        {interiorPhotos.length > 0 ? (
          <>
            <SectionTitle label="Nội thất xe" />
            <View style={styles.interiorList}>
              {interiorPhotos.map((photoUrl, index) => (
                <View
                  key={`${photoUrl}-${index}`}
                  style={[styles.interiorCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.interiorPhoto}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── Thông số kỹ thuật ────────────────────────────────────────────── */}
        <SectionTitle label="Thông số kỹ thuật" />
        <View style={styles.specsGrid}>
          <SpecCard icon="🪑" label="Số chỗ" value={`${car.seat_count} chỗ`} />
          <SpecCard icon={FUEL_ICON[car.fuel_type] ?? "⛽"} label="Nhiên liệu" value={FUEL_LABEL[car.fuel_type] ?? car.fuel_type} />
          <SpecCard icon="⚙️" label="Hộp số" value={TRANSMISSION_LABEL[car.transmission] ?? car.transmission} />
          {car.type_name ? (
            <SpecCard icon="🚘" label="Loại xe" value={car.type_name} />
          ) : null}
        </View>

        {/* ── Đánh giá ─────────────────────────────────────────────────────── */}
        <SectionTitle label="Đánh giá" />
        <View style={[styles.ratingCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <StarRow rating={car.avg_rating} count={car.rating_count} />
        </View>

        {/* ── Thông tin chủ xe ─────────────────────────────────────────────── */}
        <SectionTitle label="Thông tin chủ xe" />
        <View style={[styles.ownerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.ownerRow}>
            <View style={[styles.ownerAvatar, { backgroundColor: (theme.colors.primary ?? "#2563eb") + "18" }]}>
              <Text style={styles.ownerAvatarText}>
                {car.owner_name ? car.owner_name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={[styles.ownerName, { color: theme.colors.text }]}>
                {car.owner_name ?? "Không rõ"}
              </Text>
              {car.owner_phone ? (
                <Text style={[styles.ownerPhone, { color: theme.colors.textMuted }]}>
                  {car.owner_phone}
                </Text>
              ) : null}
            </View>
            {car.owner_phone ? (
              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: (theme.colors.success ?? "#10b981") + "15", borderColor: (theme.colors.success ?? "#10b981") + "40" }]}
                onPress={handleCallOwner}
                activeOpacity={0.7}
              >
                <Text style={[styles.callBtnText, { color: theme.colors.success ?? "#10b981" }]}>
                  📞 Gọi
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Bottom padding để nút không che nội dung */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Nút Thuê ngay cố định phía dưới ─────────────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.rentBtn, { backgroundColor: theme.colors.primary ?? "#2563eb" }]}
          onPress={handleRentNow}
          activeOpacity={0.85}
        >
          <Text style={styles.rentBtnText}>Thuê ngay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 16 },

  // Hero
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  vehiclePhoto: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  vehicleIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleIcon: { fontSize: 44 },
  vehicleName: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  plateChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  plateText: { fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  typeChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeText: { fontSize: 13, fontWeight: "600" },
  packageBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  packageBadgeText: { fontSize: 13, fontWeight: "600" },
  feeRow: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
    alignItems: "center",
  },
  feeText: { fontSize: 12 },

  // Interior photo
  interiorCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  interiorList: {
    gap: 10,
  },
  interiorPhoto: {
    width: "100%",
    height: 180,
  },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: -4,
  },

  // Specs
  specsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  specCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  specIcon: { fontSize: 26 },
  specValue: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  specLabel: { fontSize: 11, textAlign: "center" },

  // Rating
  ratingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  starRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ratingBig: { fontSize: 40, fontWeight: "800", lineHeight: 48 },
  starsWrap: { gap: 4 },
  stars: { fontSize: 22, letterSpacing: 2 },
  ratingCount: { fontSize: 13 },
  noRating: { fontSize: 14, fontStyle: "italic" },

  // Owner
  ownerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerAvatarText: { fontSize: 22, fontWeight: "700" },
  ownerInfo: { flex: 1, gap: 2 },
  ownerName: { fontSize: 15, fontWeight: "700" },
  ownerPhone: { fontSize: 13 },
  callBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callBtnText: { fontSize: 13, fontWeight: "700" },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  rentBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  rentBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
