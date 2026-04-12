import * as Location from 'expo-location';
import { apiClient } from '../api/client';
import type { DriverLocation, LocationError, LocationPermissionStatus, WorkingOverview } from '../../types/working';

let autoTimer: ReturnType<typeof setInterval> | null = null;

const normalizeError = (error: unknown): LocationError => {
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    return error as LocationError;
  }
  return { code: 'UNKNOWN', message: 'Không thể cập nhật vị trí' };
};

type BackendLocationResponse = {
  location?: { lat: number; long: number; updated_at?: string } | null;
  [key: string]: unknown;
};

export const locationService = {
  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  },

  async requestPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  },

  async updateCurrentLocationManual(): Promise<WorkingOverview> {
    const permission = await locationService.getPermissionStatus();
    if (permission !== 'granted') {
      throw { code: 'LOCATION_PERMISSION_DENIED', message: 'Chưa cấp quyền vị trí' } as LocationError;
    }

    let coords: Location.LocationObjectCoords;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      coords = loc.coords;
    } catch {
      throw { code: 'GPS_ERROR', message: 'Không lấy được tọa độ GPS' } as LocationError;
    }

    try {
      await apiClient.post('/api/driver/location', {
        lat: coords.latitude,
        long: coords.longitude,
        b_angle: coords.heading ?? 0
      });
    } catch (error) {
      throw normalizeError(error);
    }

    // Fetch lại working overview để cập nhật lastLocation trong UI
    const statusResponse = await apiClient.get('/api/driver/working-status');
    const data = statusResponse.data.data as {
      online?: number;
      route?: { name?: string } | null;
      reg_route?: { name?: string } | null;
      available_for_rental?: number;
      location?: { lat: number; long: number; updated_at?: string } | null;
    };

    return {
      isOnline: data.online === 1,
      operationZone: data.route?.name ?? data.reg_route?.name ?? 'Không xác định',
      gpsStatus: 'ready',
      permissionStatus: 'granted',
      networkStatus: 'online',
      workingStatusLabel: data.online === 1 ? 'Online' : 'Offline',
      activeServiceTypes: data.available_for_rental === 1 ? ['thue_tai_xe'] : ['goi_xe'],
      lastLocation: data.location
        ? { lat: data.location.lat, lng: data.location.long, updatedAt: data.location.updated_at ?? new Date().toISOString() }
        : { lat: coords.latitude, lng: coords.longitude, updatedAt: new Date().toISOString() },
      autoUpdating: autoTimer !== null
    };
  },

  startPeriodicLocationUpdate(
    onTick: (overview: WorkingOverview) => void,
    onError?: (error: LocationError) => void
  ) {
    if (autoTimer) {
      return;
    }

    autoTimer = setInterval(async () => {
      try {
        const data = await locationService.updateCurrentLocationManual();
        onTick(data);
      } catch (error) {
        onError?.(normalizeError(error));
      }
    }, 15000);
  },

  stopPeriodicLocationUpdate() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  },

  // setPeriodicUpdate: chỉ bật/tắt flag phía backend heartbeat, không tự động gửi vị trí
  async setPeriodicUpdate(enabled: boolean): Promise<WorkingOverview> {
    await apiClient.post('/api/driver/location/heartbeat', {});
    const statusResponse = await apiClient.get('/api/driver/working-status');
    const data = statusResponse.data.data as {
      online?: number;
      route?: { name?: string } | null;
      reg_route?: { name?: string } | null;
      available_for_rental?: number;
      location?: { lat: number; long: number; updated_at?: string } | null;
    };

    return {
      isOnline: data.online === 1,
      operationZone: data.route?.name ?? data.reg_route?.name ?? 'Không xác định',
      gpsStatus: 'ready',
      permissionStatus: enabled ? 'granted' : 'denied',
      networkStatus: 'online',
      workingStatusLabel: data.online === 1 ? 'Online' : 'Offline',
      activeServiceTypes: data.available_for_rental === 1 ? ['thue_tai_xe'] : ['goi_xe'],
      lastLocation: data.location
        ? { lat: data.location.lat, lng: data.location.long, updatedAt: data.location.updated_at ?? new Date().toISOString() }
        : null,
      autoUpdating: enabled
    };
  }
};
