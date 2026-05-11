import { useState, useEffect, useCallback } from 'react';
import { driverSseClient } from '../services/realtime/driverSseClient';

export interface RentalAssignedNotif {
  type: 'RENTAL_ASSIGNED_BY_ADMIN';
  rentalId: number;
  rentalCode: string;
  startDatetime: string;
  endDatetime: string;
  pickupAddress: string;
  totalPrice: number;
}

export function useRentalAssignedNotification(accessToken: string | null) {
  const [assignedNotif, setAssignedNotif] = useState<RentalAssignedNotif | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const unsub = driverSseClient.on('RENTAL_ASSIGNED_BY_ADMIN', (payload: RentalAssignedNotif) => {
      setAssignedNotif(payload);
    });
    return () => { unsub(); };
  }, [accessToken]);

  const dismissAssignedNotif = useCallback(() => setAssignedNotif(null), []);
  return { assignedNotif, dismissAssignedNotif, setAssignedNotif };
}
