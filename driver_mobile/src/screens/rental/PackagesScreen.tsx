import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../../layouts/MainLayout';
import { packagesApi, SystemPackage } from '../../services/api/packagesApi';

const QUERY_KEY = ['driver', 'packages'];

export const PackagesScreen = () => {
  const queryClient = useQueryClient();
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const { data: packages = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: packagesApi.getPackages,
  });

  const enrollMutation = useMutation({
    mutationFn: (pkgId: number) => packagesApi.selectPackage({ package_id: pkgId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: (enrollmentId: number) => packagesApi.removePackage(enrollmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const hasActivePackage = packages.some((p) => p.enrollment_status === 'active');

  const handleToggle = useCallback(
    async (pkg: SystemPackage) => {
      const id = pkg.package_id;
      setLoadingIds((prev) => new Set(prev).add(id));

      try {
        if (pkg.enrollment_status === 'active' && pkg.enrollment_id) {
          await removeMutation.mutateAsync(pkg.enrollment_id);
        } else {
          await enrollMutation.mutateAsync(id);
        }
      } catch (err: any) {
        Alert.alert('Lỗi', err?.response?.data?.message || 'Có lỗi xảy ra');
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [enrollMutation, removeMutation]
  );

  const renderPackage = ({ item: pkg }: { item: SystemPackage }) => {
    const isActive = pkg.enrollment_status === 'active';
    const isToggling = loadingIds.has(pkg.package_id);
    const isDisabled = hasActivePackage && !isActive;
    const serviceLabel = pkg.service_type === 2 ? 'Thuê tài xế' : 'Xe + Tài xế';

    return (
      <View style={[styles.card, isActive && styles.cardActive, isDisabled && styles.cardDisabled]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.packageName}>{pkg.package_name}</Text>
            <Text style={styles.serviceLabel}>{serviceLabel}</Text>
          </View>
          {isToggling ? (
            <ActivityIndicator size="small" color="#F59E0B" />
          ) : (
            <Switch
              value={isActive}
              onValueChange={() => handleToggle(pkg)}
              disabled={isDisabled}
              trackColor={{ false: '#D1D5DB', true: '#FCD34D' }}
              thumbColor={isActive ? '#F59E0B' : '#9CA3AF'}
            />
          )}
        </View>

        <View style={styles.infoRow}>
          <InfoChip label="Thời gian" value={pkg.duration_hours ? `${pkg.duration_hours}h` : 'Không giới hạn'} />
          <InfoChip label="Giá" value={formatCurrency(pkg.base_price)} />
          <InfoChip label="Đặt cọc" value={formatCurrency(pkg.deposit_amount)} />
        </View>

        {pkg.distance_limit_km > 0 && (
          <Text style={styles.distanceInfo}>
            Giới hạn: {pkg.distance_limit_km} km — Phụ phí: {formatCurrency(pkg.extra_km_fee)}/km
          </Text>
        )}

        {pkg.description ? (
          <Text style={styles.description} numberOfLines={2}>{pkg.description}</Text>
        ) : null}

        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>✓ Gói đang đăng ký</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <MainLayout title="Đăng ký gói cho thuê">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Đang tải gói thuê...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Đăng ký gói cho thuê" scrollable={false}>
      {hasActivePackage && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Bạn đang đăng ký 1 gói. Hủy đăng ký gói hiện tại để chọn gói khác.
          </Text>
        </View>
      )}
      <FlatList
        data={packages}
        keyExtractor={(item) => String(item.package_id)}
        renderItem={renderPackage}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#F59E0B" />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Chưa có gói thuê nào.</Text>
          </View>
        }
      />
    </MainLayout>
  );
};

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#6B7280' },
  emptyText: { color: '#6B7280', fontSize: 16 },
  infoBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  infoBannerText: { color: '#92400E', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardActive: { borderWidth: 2, borderColor: '#F59E0B' },
  cardDisabled: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  packageName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  serviceLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  chipLabel: { fontSize: 10, color: '#6B7280' },
  chipValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  distanceInfo: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  description: { fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 18 },
  activeBadge: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 6,
    alignSelf: 'flex-start',
  },
  activeBadgeText: { color: '#92400E', fontSize: 12, fontWeight: '600' },
});
