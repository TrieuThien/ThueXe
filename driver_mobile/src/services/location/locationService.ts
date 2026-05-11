import * as Location from 'expo-location';
import { apiClient } from '../api/client';
import type { DriverLocation, LocationError, LocationPermissionStatus, WorkingOverview } from '../../types/working';

export type LocationMode = 'idle' | 'searching' | 'assigned';

let locationSubscription: Location.LocationSubscription | null = null;
let currentMode: LocationMode = 'searching';
let currentOnTick: ((lat: number, lng: number) => void) | null = null;
let currentOnError: ((error: LocationError) => void) | null = null;

const getWatchConfig = (mode: LocationMode): Location.LocationOptions => {
  if (mode === 'assigned') {
    return { accuracy: Location.Accuracy.High, timeInterval: 5_000, distanceInterval: 10 };
  }
  if (mode === 'idle') {
    return { accuracy: Location.Accuracy.Balanced, timeInterval: 30_000, distanceInterval: 100 };
  }
  return { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 50 };
};

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
      autoUpdating: locationSubscription !== null
    };
  },

  startPeriodicLocationUpdate(
    onTick: (lat: number, lng: number) => void,
    onError?: (error: LocationError) => void,
    mode: LocationMode = 'searching'
  ) {
    if (locationSubscription) return;

    currentMode = mode;
    currentOnTick = onTick;
    currentOnError = onError ?? null;

    Location.watchPositionAsync(
      getWatchConfig(mode),
      async (loc) => {
        const { latitude, longitude, heading } = loc.coords;
        try {
          await apiClient.post('/api/driver/location', {
            lat: latitude,
            long: longitude,
            b_angle: heading ?? 0,
          });
          currentOnTick?.(latitude, longitude);
        } catch (error) {
          currentOnError?.(normalizeError(error));
        }
      }
    ).then((sub) => { locationSubscription = sub; });
  },

  setLocationMode(mode: LocationMode) {
    if (!locationSubscription || currentMode === mode) return;
    locationSubscription.remove();
    locationSubscription = null;
    currentMode = mode;

    if (currentOnTick) {
      Location.watchPositionAsync(
        getWatchConfig(mode),
        async (loc) => {
          const { latitude, longitude, heading } = loc.coords;
          try {
            await apiClient.post('/api/driver/location', {
              lat: latitude,
              long: longitude,
              b_angle: heading ?? 0,
            });
            currentOnTick?.(latitude, longitude);
          } catch (error) {
            currentOnError?.(normalizeError(error));
          }
        }
      ).then((sub) => { locationSubscription = sub; });
    }
  },

  stopPeriodicLocationUpdate() {
    locationSubscription?.remove();
    locationSubscription = null;
    currentOnTick = null;
    currentOnError = null;
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
