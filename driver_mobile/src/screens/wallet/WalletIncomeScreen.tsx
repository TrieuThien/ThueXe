import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { IncomeChart, TransactionItem, WalletSummaryCard } from '../../components/wallet';
import {
  useWalletIncomeStatsQuery,
  useWalletSummaryQuery,
  useWalletTransactionsQuery
} from '../../hooks/useWalletModuleQueries';
import type { WalletStackParamList } from '../../types/navigation';
import type { IncomePeriod, WalletTransaction } from '../../types/wallet';

type WalletTab = 'doanh_thu' | 'vi' | 'giao_dich';

const tabs: { id: WalletTab; label: string }[] = [
  { id: 'doanh_thu', label: 'Doanh thu' },
  { id: 'vi', label: 'Ví' },
  { id: 'giao_dich', label: 'Giao dịch' }
];

export const WalletIncomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const tabBarHeight = useBottomTabBarHeight();
  const [activeTab, setActiveTab] = useState<WalletTab>('doanh_thu');
  const [period, setPeriod] = useState<IncomePeriod>('day');
  const [fromDateInput, setFromDateInput] = useState('');
  const [toDateInput, setToDateInput] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  const summaryQuery = useWalletSummaryQuery();
  const incomeQuery = useWalletIncomeStatsQuery(period, appliedFromDate || undefined, appliedToDate || undefined);
  const transactionsQuery = useWalletTransactionsQuery(appliedFromDate || undefined, appliedToDate || undefined);

  const isLoading = summaryQuery.isLoading || incomeQuery.isLoading || transactionsQuery.isLoading;
  const isError = summaryQuery.isError || incomeQuery.isError || transactionsQuery.isError;

  const applyTimeFilter = () => {
    setAppliedFromDate(fromDateInput.trim());
    setAppliedToDate(toDateInput.trim());
  };

  const periodLabel = useMemo(() => (period === 'day' ? 'Theo ngày' : 'Theo tháng'), [period]);

  if (isLoading) {
    return <LoadingState label="Đang tải dữ liệu..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Không tải được dữ liệu"
        onRetry={() => {
          void summaryQuery.refetch();
          void incomeQuery.refetch();
          void transactionsQuery.refetch();
        }}
      />
    );
  }

  if (!summaryQuery.data || !incomeQuery.data || !transactionsQuery.data) {
    return <EmptyState title="Không có dữ liệu" description="Dữ liệu ví sẽ hiển thị sau khi phát sinh giao dịch." />;
  }

  const incomePoints = Array.isArray(incomeQuery.data.points) ? incomeQuery.data.points : [];
  const transactionItems: WalletTransaction[] = Array.isArray(transactionsQuery.data.items) ? transactionsQuery.data.items : [];
  const isTransactionTab = activeTab === 'giao_dich';

  const header = (
    <>
      <View style={styles.actionRow}>
        <Pressable onPress={() => navigation.navigate('WalletTopUp')} style={styles.topupBtn}>
          <Text style={styles.actionText}>Nạp tiền</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('WalletWithdrawal')} style={styles.withdrawBtn}>
          <Text style={styles.actionText}>Rút tiền</Text>
        </Pressable>
      </View>

      <View style={styles.tabWrap}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.filterCard}>
        <View style={styles.periodRow}>
          <Text style={styles.filterTitle}>Bộ lọc thời gian</Text>
          <Pressable onPress={() => setPeriod(period === 'day' ? 'month' : 'day')} style={styles.periodBtn}>
            <Text style={styles.periodText}>{periodLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.dateRow}>
          <TextInput
            value={fromDateInput}
            onChangeText={setFromDateInput}
            placeholder="Từ ngày"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.flexInput]}
          />
          <TextInput
            value={toDateInput}
            onChangeText={setToDateInput}
            placeholder="Đến ngày"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.flexInput]}
          />
        </View>

        <Pressable onPress={applyTimeFilter} style={styles.applyBtn}>
          <Text style={styles.applyText}>Áp dụng</Text>
        </Pressable>
      </View>

      {!isTransactionTab ? <WalletSummaryCard summary={summaryQuery.data} /> : null}

      {activeTab === 'doanh_thu' ? (
        incomePoints.length ? (
          <IncomeChart points={incomePoints} />
        ) : (
          <EmptyState title="Không có dữ liệu doanh thu" description="Hãy thử lại bộ lọc thời gian." />
        )
      ) : null}

      {isTransactionTab && !transactionItems.length ? (
        <EmptyState title="Chưa có giao dịch" description="Không có giao dịch nào trong khoảng thời gian đã chọn." />
      ) : null}
    </>
  );

  return (
    <MainLayout title="Ví và thu nhập" scrollable={false}>
      <FlatList
        data={isTransactionTab ? transactionItems : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
        style={styles.listRoot}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={8}
        maxToRenderPerBatch={12}
      />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  topupBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center'
  },
  withdrawBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#0E7490',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16
  },
  tabWrap: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    padding: 6,
    marginVertical: 12
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10
  },
  tabActive: {
    backgroundColor: '#FFFFFF'
  },
  tabText: {
    color: '#334155',
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#0F766E',
    fontWeight: '800'
  },
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
    marginVertical: 4
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  filterTitle: {
    fontWeight: '700',
    color: '#0F172A'
  },
  periodBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0F766E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5'
  },
  periodText: {
    color: '#0F766E',
    fontWeight: '700'
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8
  },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    color: '#0F172A'
  },
  flexInput: {
    flex: 1
  },
  applyBtn: {
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E'
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  list: {
    gap: 10,
    paddingTop: 12,
    paddingBottom: 16
  },
  listRoot: {
    flex: 1
  }
});
