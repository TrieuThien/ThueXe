import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MainLayout } from '../../layouts/MainLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { CardInfo, StatusBadge } from '../../components/account';
import { useAccountStatusQuery, useDashboardQuery, useProfileQuery, useWalletQuery } from '../../hooks/useDriverQueries';
import { formatCurrency } from '../../utils/format';

const QUICK_ACTIONS = [
  { key: 'work_status', label: 'Trạng thái làm việc', tab: 'WorkTab', screen: 'WorkingStatus' },
  { key: 'driver_schedule', label: 'Lịch cho thuê', tab: 'WorkTab', screen: 'DriverSchedule' },
  { key: 'rental_packages', label: 'Đăng ký gói cho thuê', tab: 'DashboardTab', screen: 'PackagesList' },
  { key: 'current_trip', label: 'Chuyến hiện tại', tab: 'WorkTab', screen: 'CurrentTrip' },
  { key: 'trip_history', label: 'Lịch sử chuyến', tab: 'HistoryTab', screen: 'TripHistory' },
  { key: 'wallet', label: 'Ví', tab: 'WalletTab', screen: 'WalletIncome' },
  { key: 'support', label: 'Hỗ trợ', tab: 'AccountTab', screen: 'Support' },
  { key: 'notifications', label: 'Thông báo', tab: 'AccountTab', screen: 'Notifications' }
];

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const profileQuery = useProfileQuery();
  const statusQuery = useAccountStatusQuery();
  const dashboardQuery = useDashboardQuery();
  const walletQuery = useWalletQuery();

  const isLoading = profileQuery.isLoading || statusQuery.isLoading || dashboardQuery.isLoading || walletQuery.isLoading;
  const isError = profileQuery.isError || statusQuery.isError || dashboardQuery.isError || walletQuery.isError;

  if (isLoading) {
    return <LoadingState label="Đang tải màn hình tổng quan tài xế..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Không tải được dữ liệu tổng quan"
        onRetry={() => {
          void profileQuery.refetch();
          void statusQuery.refetch();
          void dashboardQuery.refetch();
          void walletQuery.refetch();
        }}
      />
    );
  }

  if (!profileQuery.data || !statusQuery.data || !dashboardQuery.data || !walletQuery.data) {
    return <EmptyState title="Chưa có dữ liệu" description="Thông tin dashboard đang được cập nhật." />;
  }

  const profile = profileQuery.data;
  const status = statusQuery.data;
  const dashboard = dashboardQuery.data;
  const wallet = walletQuery.data;

  const goTo = (tab: string, screen: string) => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate(tab, { screen });
      return;
    }
    navigation.navigate(tab, { screen });
  };
  return (
    <MainLayout title="Tổng quan tài xế">
      <CardInfo title="Thông tin tài xế">
        <View style={styles.driverRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.fullName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.driverMeta}>
            <Text style={styles.driverName}>{profile.fullName}</Text>
            <StatusBadge status={status.accountStatus} />
          </View>
        </View>
      </CardInfo>

      <CardInfo title="Trạng thái hiện tại">
        <StatusBadge status={status.workingStatus} />
      </CardInfo>

      <View style={styles.inlineCards}>
        <CardInfo title="Thu nhập hôm nay">
          <Text style={styles.money}>{formatCurrency(dashboard.todayIncome)}</Text>
        </CardInfo>
        <CardInfo title="Số dư ví">
          <Text style={styles.money}>{formatCurrency(wallet.availableBalance)}</Text>
        </CardInfo>
      </View>

      <CardInfo title="Truy cập nhanh" subtitle="Thao tác nhanh trong khi đang làm việc">
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => goTo(action.tab, action.screen)}
              style={({ pressed }) => [styles.quickButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.quickText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </CardInfo>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800'
  },
  driverMeta: {
    gap: 6
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A'
  },
  inlineCards: {
    gap: 12
  },
  money: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F766E'
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  quickButton: {
    minWidth: '48%',
    minHeight: 58,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center'
  },
  quickText: {
    color: '#075985',
    fontWeight: '700',
    textAlign: 'center'
  }
});
