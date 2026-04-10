import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, EmptyState, ErrorState, LoadingState, WalletTransactionItem } from "../../components";
import { useWalletTransactionHistoryQuery } from "../../hooks";
import { WalletStackParamList } from "../../navigation";
import { useTheme } from "../../theme";
import { PaymentStatus, WalletLedgerType, WalletTransactionFilter } from "../../types";

type Props = NativeStackScreenProps<WalletStackParamList, "TransactionHistory">;

const typeFilters: (WalletLedgerType | "ALL")[] = ["ALL", "TOP_UP", "WITHDRAWAL", "BOOKING_PAYMENT", "RENTAL_PAYMENT", "REFUND"];
const statusFilters: (PaymentStatus | "ALL")[] = ["ALL", "PENDING", "PAID", "FAILED", "REFUNDED"];

export function TransactionHistoryScreen(_props: Props) {
  const { theme } = useTheme();
  const [selectedType, setSelectedType] = useState<WalletLedgerType | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | "ALL">("ALL");

  const filter: WalletTransactionFilter = useMemo(
    () => ({ type: selectedType, status: selectedStatus }),
    [selectedType, selectedStatus],
  );

  const query = useWalletTransactionHistoryQuery(filter);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Lịch sử giao dịch" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Lọc theo loại</Text>
        <View style={styles.filterRow}>
          {typeFilters.map((item) => (
            <FilterChip
              key={item}
              label={item}
              active={selectedType === item}
              onPress={() => setSelectedType(item)}
            />
          ))}
        </View>

        <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Lọc theo trạng thái</Text>
        <View style={styles.filterRow}>
          {statusFilters.map((item) => (
            <FilterChip
              key={item}
              label={item}
              active={selectedStatus === item}
              onPress={() => setSelectedStatus(item)}
            />
          ))}
        </View>

        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? <ErrorState onRetry={query.refetch} /> : null}
        {!query.isLoading && !query.isError && query.data?.items.length === 0 ? (
          <EmptyState title="Không có giao dịch phù hợp" />
        ) : null}

        {query.data?.items.map((item) => (
          <WalletTransactionItem key={item.id} item={item} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? theme.colors.primary : theme.colors.border,
          backgroundColor: active ? theme.colors.surfaceMuted : theme.colors.surface,
        },
      ]}
    >
      <Text style={{ color: active ? theme.colors.primary : theme.colors.textMuted, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 10,
    paddingBottom: 28,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
