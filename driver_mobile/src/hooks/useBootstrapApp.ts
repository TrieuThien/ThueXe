import { useEffect } from 'react';
import { tokenStorage } from '../services/storage/tokenStorage';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { driverService } from '../services/api/driverService';
import { realtimeClient } from '../services/realtime/socketClient';
import { useNotificationStore } from '../store/notificationStore';

export const useBootstrapApp = () => {
  const setBootstrapping = useUiStore((state) => state.setBootstrapping);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const tokens = await tokenStorage.loadTokens();
        if (!tokens || tokens.expiresAt < Date.now()) {
          await tokenStorage.clearTokens();
          if (active) {
            clearSession();
          }
          return;
        }

        const profile = await driverService.getProfile();
        if (active) {
          setSession(profile, tokens);
          const unread = await driverService.getNotificationsUnreadCount();
          setUnreadCount(unread.unreadCount);
        }
      } catch {
        await tokenStorage.clearTokens();
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setBootstrapping(false);
          realtimeClient.connect();
        }
      }
    };

    bootstrap();

    const unsubscribe = realtimeClient.subscribe((event) => {
      if (event.type === 'notification') {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return () => {
      active = false;
      unsubscribe();
      realtimeClient.disconnect();
    };
  }, [clearSession, setBootstrapping, setSession, setUnreadCount]);
};
