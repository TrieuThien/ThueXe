import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, EmptyState, ErrorState, LoadingState, PaymentMethodListItem, PrimaryButton, TextField } from "../../components";
import { usePaymentMethodsQuery, useTopUpWalletMutation } from "../../hooks";
import { WalletStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<WalletStackParamList, "TopUpWallet">;

export function TopUpWalletScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [amountText, setAmountText] = useState("100000");
  const [selectedMethodId, setSelectedMethodId] = useState<string | undefined>();

  const methodsQuery = usePaymentMethodsQuery();
  const topupMutation = useTopUpWalletMutation();

  const topUpMethods = useMemo(
    () => methodsQuery.data?.filter((item) => item.type !== "CASH" && item.type !== "WALLET") ?? [],
    [methodsQuery.data],
  );

  const resolvedMethodId = useMemo(() => {
    if (selectedMethodId) {
      return selectedMethodId;
    }
    return topUpMethods[0]?.id;
  }, [selectedMethodId, topUpMethods]);

  const onTopUp = async () => {
    const amount = Number(amountText.replace(/[^0-9]/g, ""));
    if (!resolvedMethodId || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    try {
      const result = await topupMutation.mutateAsync({ amount, paymentMethodId: resolvedMethodId });

      if (result.redirectUrl) {
        // Gateway payment (MoMo, ...): mở URL thanh toán
        const canOpen = await Linking.canOpenURL(result.redirectUrl);
        if (canOpen) {
          await Linking.openURL(result.redirectUrl);
        } else {
          Alert.alert("Lỗi", "Không thể mở ứng dụng thanh toán. Vui lòng thử lại.");
          return;
        }
        // Quay về – ví sẽ tự cập nhật khi IPN xác nhận qua realtime
        navigation.goBack();
      } else {
        Alert.alert("Nạp", "Nạp tiền thành công");
        navigation.goBack();
      }
    } catch {
      Alert.alert("Nạp", "Nạp tiền thất bại");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Nạp tiền vào ví" />
      <ScrollView contentContainerStyle={styles.container}>
        <TextField label="Số tiền nạp" keyboardType="number-pad" value={amountText} onChangeText={setAmountText} placeholder="100000" />

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Chọn phương thức thanh toán</Text>
        {methodsQuery.isLoading ? <LoadingState message="Đang tải phương thức thanh toán..." /> : null}
        {methodsQuery.isError ? <ErrorState description="Không tải được danh sách phương thức thanh toán" onRetry={methodsQuery.refetch} /> : null}

        {!methodsQuery.isLoading && !methodsQuery.isError && topUpMethods.length === 0 ? (
          <EmptyState title="Không có phương thức nạp phù hợp" description="Vui lòng dùng ví điện tử hoặc thẻ ngân hàng để nạp tiền." />
        ) : null}

        {topUpMethods.map((item) => (
          <PaymentMethodListItem
            key={item.id}
            item={item}
            selected={resolvedMethodId === item.id}
            onPress={() => setSelectedMethodId(item.id)}
          />
        ))}

        <PrimaryButton title="Nạp tiền" onPress={onTopUp} loading={topupMutation.isPending} disabled={!resolvedMethodId} />
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
});
