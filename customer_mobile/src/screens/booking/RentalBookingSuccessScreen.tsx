import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, PrimaryButton } from "../../components";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalBookingSuccess">;

export function RentalBookingSuccessScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const resetRentalFlow = useRentalFlowStore((state) => state.resetRentalFlow);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Đặt thuê thành công" />
      <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
        <Text style={[styles.title, { color: theme.colors.text }]}>Yêu cầu của bạn đã được ghi nhận</Text>
        <Text style={[styles.message, { color: theme.colors.textMuted }]}>{route.params.message}</Text>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Booking ID: {route.params.bookingId}</Text>
        <Text style={[styles.meta, { color: theme.colors.textMuted }]}>Trạng thái: {route.params.status}</Text>

        <PrimaryButton
          title="Về màn hình đặt xe"
          onPress={() => {
            resetRentalFlow();
            navigation.navigate("BookingHome");
          }}
        />
        <PrimaryButton title="Xem lịch sử" onPress={() => navigation.navigate("DriverHireHistory")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  card: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  message: {
    fontSize: 14,
  },
  meta: {
    fontSize: 12,
  },
});
