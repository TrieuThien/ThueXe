import { StyleSheet, Text } from "react-native";

import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";
import { AppCard } from "../ui";

interface WalletBalanceCardProps {
  balance: number;
  ownerName?: string;
}

export function WalletBalanceCard({ balance, ownerName }: WalletBalanceCardProps) {
  const { theme } = useTheme();

  return (
    <AppCard style={[styles.card, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}> 
      <Text style={styles.caption}>Số dư ví</Text>
      <Text style={styles.amount}>{formatCurrencyVND(balance)}</Text>
      {ownerName ? <Text style={styles.caption}>Chủ tài khoản: {ownerName}</Text> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  caption: {
    color: "#EAF4FF",
    fontSize: 13,
  },
  amount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
});
