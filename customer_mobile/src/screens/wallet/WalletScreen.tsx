import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, ErrorState, LoadingState, WalletBalanceCard } from "../../components";
import { useWalletOverviewQuery } from "../../hooks";
import { WalletStackParamList } from "../../navigation";
import { useAuthStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletMain">;

export function WalletScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const overviewQuery = useWalletOverviewQuery();

  const actions: Array<{
    id: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }> = [
    {
      id: "payment-method",
      title: "Phương thức thanh toán",
      icon: "card-outline",
      onPress: () => navigation.navigate("PaymentMethod", {}),
    },
    {
      id: "top-up",
      title: "Nạp tiền vào ví",
      icon: "add-circle-outline",
      onPress: () => navigation.navigate("TopUpWallet"),
    },
    {
      id: "withdraw",
      title: "Rút tiền",
      icon: "cash-outline",
      onPress: () => navigation.navigate("WithdrawalRequest"),
    },
    {
      id: "history",
      title: "Lịch sử giao dịch",
      icon: "time-outline",
      onPress: () => navigation.navigate("TransactionHistory"),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Ví và thanh toán" />
      <ScrollView contentContainerStyle={styles.container}>
        {overviewQuery.isLoading ? <LoadingState /> : null}
        {overviewQuery.isError ? <ErrorState onRetry={overviewQuery.refetch} /> : null}

        {overviewQuery.data ? <WalletBalanceCard balance={overviewQuery.data.balance} ownerName={currentUser?.fullName} /> : null}

        <View style={styles.actionGrid}>
          {actions.map((action) => (
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 12,
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
});
