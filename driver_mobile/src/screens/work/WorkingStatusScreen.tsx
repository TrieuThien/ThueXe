import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { CardInfo, StatusBadge } from '../../components/account';
import {
  useActiveServiceTypesQuery,
  useManualLocationUpdateMutation,
  usePeriodicLocationMutation,
  useToggleOnlineMutation,
  useUpdateServiceTypesMutation,
  useWorkingOverviewQuery
} from '../../hooks/useWorkingQueries';
import { locationService } from '../../services/location/locationService';
import { queryKeys } from '../../constants/queryKeys';
import type { LocationError, ServiceTypeId } from '../../types/working';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { WorkStackParamList } from '../../types/navigation';

const SERVICE_TYPE_OPTIONS: { id: ServiceTypeId; label: string }[] = [
  { id: 'goi_xe', label: 'Gọi xe' },
  { id: 'thue_tai_xe', label: 'Thuê tài xế' },
  { id: 'xe_kem_tai_xe', label: 'Xe kèm tài xế' },
  { id: 'lien_tinh', label: 'Liên tỉnh' }
];

const getFriendlyError = (error: unknown) => {
  const item = error as { code?: string; message?: string };

  if (item?.code === 'LOCATION_PERMISSION_DENIED') {
    return 'Cần cấp quyền vị trí.';
  }
  if (item?.code === 'GPS_DISABLED') {
    return 'GPS đang tắt. Vui lòng bật GPS để tiếp tục.';
  }
  if (item?.code === 'NETWORK_ERROR') {
    return 'Không có kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
  }

  return item?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.';
};

export const WorkingStatusScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WorkStackParamList>>();
  const queryClient = useQueryClient();
  const workingQuery = useWorkingOverviewQuery();
  const activeTypesQuery = useActiveServiceTypesQuery();

  const toggleOnlineMutation = useToggleOnlineMutation();
  const updateServiceTypesMutation = useUpdateServiceTypesMutation();
  const manualLocationMutation = useManualLocationUpdateMutation();
  const periodicMutation = usePeriodicLocationMutation();

  const [uiError, setUiError] = useState('');

  const isLoading = workingQuery.isLoading || activeTypesQuery.isLoading;
  const isError = workingQuery.isError || activeTypesQuery.isError;

  useEffect(() => {
    return () => {
      locationService.stopPeriodicLocationUpdate();
    };
  }, []);

  const selectedTypes = useMemo(
    () => (Array.isArray(activeTypesQuery.data) ? activeTypesQuery.data : []),
    [activeTypesQuery.data]
  );

  if (isLoading) {
    return <LoadingState label="Đang tải trạng thái làm việc..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Không tải được trạng thái làm việc"
        onRetry={() => {
          void workingQuery.refetch();
          void activeTypesQuery.refetch();
        }}
      />
    );
  }

  if (!workingQuery.data) {
    return <EmptyState title="Chưa có dữ liệu" description="Thông tin trạng thái sẽ hiển thị tại đây." />;
  }

  const overview = workingQuery.data;

  const toggleServiceType = async (typeId: ServiceTypeId) => {
    setUiError('');
    const next = selectedTypes.includes(typeId)
      ? selectedTypes.filter((item) => item !== typeId)
      : [...selectedTypes, typeId];

    try {
      await updateServiceTypesMutation.mutateAsync({ serviceTypes: next });
    } catch (error) {
      setUiError(getFriendlyError(error));
    }
  };

  const handleOnlineChange = async (nextValue: boolean) => {
    setUiError('');

    if (nextValue) {
      const permission = await locationService.getPermissionStatus();
      if (permission !== 'granted') {
        const granted = await locationService.requestPermission();
        if (granted !== 'granted') {
          setUiError('Bạn chưa cấp quyền vị trí. Không thể bật online.');
          return;
        }
        await workingQuery.refetch();
      }
    }

    try {
      await toggleOnlineMutation.mutateAsync(nextValue);
      await workingQuery.refetch();
    } catch (error) {
      setUiError(getFriendlyError(error));
    }
  };

  const handleManualLocationUpdate = async () => {
    setUiError('');
    try {
      await manualLocationMutation.mutateAsync();
      await workingQuery.refetch();
    } catch (error) {
      setUiError(getFriendlyError(error));
    }
  };

  const handleAutoUpdateChange = async (enabled: boolean) => {
    setUiError('');
    try {
      const next = await periodicMutation.mutateAsync(enabled);
      queryClient.setQueryData(queryKeys.workingOverview, next);

      if (enabled) {
        locationService.startPeriodicLocationUpdate(
          (data) => {
            queryClient.setQueryData(queryKeys.workingOverview, data);
          },
          (error: LocationError) => {
            setUiError(getFriendlyError(error));
          }
        );
      } else {
        locationService.stopPeriodicLocationUpdate();
      }
    } catch (error) {
      setUiError(getFriendlyError(error));
    }
  };

  return (
    <MainLayout title="Trạng thái làm việc">
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapLabel}>Map placeholder</Text>
        {overview.lastLocation ? (
          <Text style={styles.locationText}>
            {overview.lastLocation.lat.toFixed(5)}, {overview.lastLocation.lng.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.locationText}>Chưa có vị trí</Text>
        )}
      </View>

      <CardInfo title="Online / Offline" subtitle="Bắt đầu online để nhận cuộc gọi mới">
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{overview.isOnline ? 'DANG ONLINE' : 'DANG OFFLINE'}</Text>
          <Switch value={overview.isOnline} onValueChange={handleOnlineChange} trackColor={{ true: '#10B981', false: '#94A3B8' }} />
        </View>
      </CardInfo>

      <CardInfo title="Loại hình hoạt động hiện tại">
        <View style={styles.chipsWrap}>
          {SERVICE_TYPE_OPTIONS.map((item) => {
            const selected = selectedTypes.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => void toggleServiceType(item.id)}
                style={[styles.chip, selected && styles.chipActive]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </CardInfo>

      <CardInfo title="Trạng thái hệ thống">
        <StatusBadge status={overview.isOnline ? 'online' : 'offline'} />
        <Text style={styles.meta}>Loại hình hoạt động: {selectedTypes.length || 0}</Text>
        <Text style={styles.meta}>Khu vực hoạt động: {overview.operationZone}</Text>
        <Text style={styles.meta}>GPS: {overview.gpsStatus}</Text>
        <Text style={styles.meta}>Quyền vị trí: {overview.permissionStatus}</Text>
        <Text style={styles.meta}>Kết nối mạng: {overview.networkStatus}</Text>
      </CardInfo>

      <CardInfo title="Cập nhật vị trí hiện tại">
        <AppButton title="Cập nhật vị trí thủ công" onPress={handleManualLocationUpdate} loading={manualLocationMutation.isPending} />
        <AppButton title="Mở lịch cho thuê tài xế" onPress={() => navigation.navigate('DriverSchedule')} />
        <View style={styles.switchRow}>
          <Text style={styles.meta}>Cập nhật định kỳ mỗi 15 giây</Text>
          <Switch value={overview.autoUpdating} onValueChange={handleAutoUpdateChange} />
        </View>
      </CardInfo>

      {uiError ? <ErrorState title="Lỗi trạng thái" description={uiError} /> : null}
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  mapPlaceholder: {
    borderRadius: 16,
    minHeight: 180,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  mapLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A'
  },
  locationText: {
    color: '#1E40AF',
    fontWeight: '600'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  switchLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#94A3B8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC'
  },
  chipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1'
  },
  chipText: {
    color: '#334155',
    fontWeight: '700'
  },
  chipTextActive: {
    color: '#0F766E'
  },
  meta: {
    fontSize: 15,
    color: '#334155'
  }
});
