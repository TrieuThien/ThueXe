import { apiClient } from '../api/client';
import { mockGpsService } from './mockGpsService';
import type { DriverLocation, LocationError, LocationPermissionStatus, WorkingOverview } from '../../types/working';

let autoTimer: ReturnType<typeof setInterval> | null = null;

const normalizeError = (error: unknown): LocationError => {
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    return error as LocationError;
  }
  return { code: 'UNKNOWN', message: 'Không thể cập nhật vị trí' };
};

export const locationService = {
  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    return mockGpsService.getPermissionStatus();
  },

  async requestPermission(): Promise<LocationPermissionStatus> {
    const permission = await mockGpsService.requestPermission();
    await apiClient.patch('/driver/location/permission', {
      permissionStatus: permission
    });
    return permission;
  },

  async updateCurrentLocationManual(): Promise<WorkingOverview> {
    try {
      const location = await mockGpsService.getCurrentPosition();
      const response = await apiClient.patch('/driver/location/manual-update', location);
      return response.data.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async updateLocationWithCoordinates(payload: DriverLocation): Promise<WorkingOverview> {
    const response = await apiClient.patch('/driver/location/manual-update', payload);
    return response.data.data;
  },

  startPeriodicLocationUpdate(onTick: (overview: WorkingOverview) => void, onError?: (error: LocationError) => void) {
    if (autoTimer) {
      return;
    }

    autoTimer = setInterval(async () => {
      try {
        const data = await this.updateCurrentLocationManual();
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

  async setPeriodicUpdate(enabled: boolean): Promise<WorkingOverview> {
    const response = await apiClient.patch('/driver/location/auto-update', { enabled });
    return response.data.data;
  }
};
