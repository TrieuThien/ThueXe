import { apiClient } from '../api/client';
import { locationService } from '../location/locationService';
import type { ServiceTypeId, WorkingOverview } from '../../types/working';

type BackendWorkingStatus = {
  online?: number;
  operation_status?: string | number | null;
  available_for_rental?: number;
  ride?: { id: number; ride_type: string } | null;
  route?: { id: number; name: string } | null;
  reg_route?: { id: number; name: string } | null;
  location?: { lat: number; long: number; b_angle?: number; updated_at?: string } | null;
};

const OFFLINE_DEFAULT: WorkingOverview = {
  isOnline: false,
  operationZone: 'Không xác định',
  gpsStatus: 'ready',
  permissionStatus: 'denied',
  networkStatus: 'online',
  workingStatusLabel: 'Offline',
  activeServiceTypes: ['goi_xe'] as ServiceTypeId[],
  lastLocation: null,
  autoUpdating: false
};

async function buildWorkingOverview(data: BackendWorkingStatus): Promise<WorkingOverview> {
  const permissionStatus = await locationService.getPermissionStatus();

  const rawLabel = data.operation_status;
  const workingStatusLabel =
    rawLabel !== null && rawLabel !== undefined && rawLabel !== 0 && rawLabel !== ''
      ? String(rawLabel)
      : data.online === 1
      ? 'Online'
      : 'Offline';

  const activeServiceTypes: ServiceTypeId[] = [
    'goi_xe',
    ...(data.available_for_rental === 1 ? (['thue_tai_xe'] as ServiceTypeId[]) : [])
  ];

  return {
    isOnline: data.online === 1,
    operationZone: data.route?.name ?? data.reg_route?.name ?? 'Không xác định',
    gpsStatus: 'ready',
    permissionStatus,
    networkStatus: 'online',
    workingStatusLabel,
    activeServiceTypes,
    lastLocation: data.location
      ? {
          lat: data.location.lat,
          lng: data.location.long,
          updatedAt: data.location.updated_at ?? new Date().toISOString()
        }
      : null,
    autoUpdating: false
  };
}

export const workingStatusService = {
  async getWorkingOverview(): Promise<WorkingOverview> {
    try {
      const response = await apiClient.get('/api/driver/working-status');
      return buildWorkingOverview(response.data.data as BackendWorkingStatus);
    } catch {
      return { ...OFFLINE_DEFAULT };
    }
  },

  async toggleOnline(isOnline: boolean): Promise<WorkingOverview> {
    const response = await apiClient.patch('/api/driver/working-status/online', {
      online: isOnline ? 1 : 0
    });
    const data = response.data.data as BackendWorkingStatus;
    try {
      const full = await workingStatusService.getWorkingOverview();
      return { ...full, isOnline: data.online === 1 };
    } catch {
      return { ...OFFLINE_DEFAULT, isOnline: data.online === 1 };
    }
  }
};
