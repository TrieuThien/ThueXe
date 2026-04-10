import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, PrimaryButton, TextField } from "../../components";
import { useWithdrawalRequestMutation } from "../../hooks";
import { WalletStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<WalletStackParamList, "WithdrawalRequest">;

export function WithdrawalRequestScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [amountText, setAmountText] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [note, setNote] = useState("");

  const mutation = useWithdrawalRequestMutation();

  const onSubmit = async () => {
    const amount = Number(amountText.replace(/[^0-9]/g, ""));

    try {
      await mutation.mutateAsync({
        amount,
        bankName: bankName || undefined,
        bankAccountName: bankAccountName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
        note: note || undefined,
      });
      Alert.alert("Rút tiền", "Gửi yêu cầu rút tiền thành công");
      navigation.goBack();
    } catch {
      Alert.alert("Rút tiền", "Gửi yêu cầu thất bại");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Yêu cầu rút tiền" />
      <ScrollView contentContainerStyle={styles.container}>
        <TextField label="Số tiền rút" keyboardType="number-pad" value={amountText} onChangeText={setAmountText} placeholder="200000" />

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tài khoản nhận tiền (mở rộng sau)</Text>
        <TextField label="Tên ngân hàng" value={bankName} onChangeText={setBankName} placeholder="VD: Vietcombank" />
        <TextField label="Tên chủ tài khoản" value={bankAccountName} onChangeText={setBankAccountName} />
        <TextField label="Số tài khoản" value={bankAccountNumber} onChangeText={setBankAccountNumber} keyboardType="number-pad" />
        <TextField label="Ghi chú" value={note} onChangeText={setNote} placeholder="Yêu cầu chuyển nhanh" />

        <PrimaryButton title="Gửi yêu cầu rút tiền" onPress={onSubmit} loading={mutation.isPending} />
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
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
});
