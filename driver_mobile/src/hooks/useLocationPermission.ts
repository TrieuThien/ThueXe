import { useCallback } from 'react';
import { permissionService, type PermissionStatus } from '../services/permissions/permissionService';

export const useLocationPermission = () => {
  const checkPermission = useCallback(async (): Promise<PermissionStatus> => {
    return permissionService.checkLocationPermission();
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    return permissionService.requestLocationPermission();
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    return permissionService.ensureLocationPermission();
  }, []);

  return {
    checkPermission,
    requestPermission,
    ensurePermission
  };
};
