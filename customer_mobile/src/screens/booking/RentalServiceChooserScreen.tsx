import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, PrimaryButton, RentalServiceTypeCard } from "../../components";
import { RENTAL_SERVICE_OPTIONS } from "../../constants";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { RentalServiceType } from "../../types";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalServiceChooser">;

export function RentalServiceChooserScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const selectedServiceType = useRentalFlowStore((state) => state.selectedServiceType);
  const setServiceType = useRentalFlowStore((state) => state.setServiceType);

  const onSelect = (serviceType: RentalServiceType) => {
    setServiceType(serviceType);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Thuê xe / Thuê tài xế" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Chọn loại dịch vụ thuê</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Bạn có thể đổi sang loại khác ở bước sau.</Text>

        {RENTAL_SERVICE_OPTIONS.map((option) => (
          <RentalServiceTypeCard
            key={option.id}
            option={option}
            selected={selectedServiceType === option.id}
            onPress={onSelect}
          />
        ))}

        <PrimaryButton
          title="Tiếp tục"
          onPress={() => navigation.navigate("RentalBookingForm")}
          disabled={!selectedServiceType}
        />
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
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
  },
});
