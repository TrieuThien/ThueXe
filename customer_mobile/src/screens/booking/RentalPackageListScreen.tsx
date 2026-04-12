import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  RentalPackageCard,
} from "../../components";
import { useRentalPackagesQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalPackageList">;

export function RentalPackageListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const criteria = useRentalFlowStore((state) => state.criteria);
  const selectedPackage = useRentalFlowStore((state) => state.selectedPackage);
  const setSelectedPackage = useRentalFlowStore((state) => state.setSelectedPackage);

  const query = useRentalPackagesQuery(criteria ?? undefined);
  const packages = Array.isArray(query.data?.packages) ? query.data.packages : [];
  const suggestions = Array.isArray(query.data?.suggestions) ? query.data.suggestions : [];

  if (!criteria) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Gói thuê" />
        <EmptyState title="Thiếu thông tin" description="Vui lòng nhập thông tin thuê trước." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Chọn gói thuê" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Danh sách gói phù hợp</Text>

        {query.isLoading ? <LoadingState message="Đang tìm gói thuê..." /> : null}
        {query.isError ? <ErrorState description="Không tải được danh sách gói" onRetry={query.refetch} /> : null}

        {query.data && packages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState title="Không có gói phù hợp" description="Thử điều chỉnh thời gian hoặc khu vực điểm đón." />
            {suggestions.map((item) => (
              <Text key={item} style={[styles.suggestion, { color: theme.colors.textMuted }]}>
                - {item}
              </Text>
            ))}
            <PrimaryButton title="Sửa thông tin" onPress={() => navigation.navigate("RentalBookingForm")} />
          </View>
        ) : null}

        {packages.map((pkg) => (
          <RentalPackageCard
            key={pkg.packageId}
            item={pkg}
            selected={selectedPackage?.packageId === pkg.packageId}
            onSelect={() => setSelectedPackage(pkg)}
          />
        ))}

        {packages.length ? (
          <>
            <PrimaryButton title="Sửa thông tin" onPress={() => navigation.navigate("RentalBookingForm")} />
            <PrimaryButton
              title="Tiếp tục xác nhận"
              onPress={() => navigation.navigate("RentalBookingConfirm")}
              disabled={!selectedPackage}
            />
          </>
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
  title: {
    fontSize: 19,
    fontWeight: "800",
  },
  emptyWrap: {
    gap: 8,
  },
  suggestion: {
    fontSize: 13,
  },
});
