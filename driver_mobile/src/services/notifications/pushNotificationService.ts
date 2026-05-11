/**
 * pushNotificationService.ts
 *
 * Xin quyền, lấy Expo push token và đăng ký lên server.
 * Gọi một lần khi tài xế đã đăng nhập (accessToken có sẵn).
 *
 * Android: tạo notification channel "driver-requests" để push hiển thị
 * ngay cả khi app bị kill.
 *
 * NOTE: Remote push notifications không hoạt động trong Expo Go (SDK 53+).
 * Chức năng này chỉ có tác dụng trong development build hoặc production build.
 * Trong Expo Go, SSE vẫn hoạt động bình thường cho trường hợp app foreground.
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authService } from '../api/authService';

// Kiểm tra đang chạy trong Expo Go hay không
function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupAndRegisterPushToken(): Promise<void> {
  // Remote push không hỗ trợ trong Expo Go từ SDK 53 trở đi
  if (isExpoGo()) {
    console.info('[Push] Expo Go detected — remote push skipped. Use a development build for full push support.');
    return;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('driver-requests', {
        name: 'Yêu cầu từ khách',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
        showBadge: false,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[Push] Notification permission denied');
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    await authService.registerPushToken(token);
    console.info('[Push] Token registered:', token);
  } catch (err) {
    console.warn('[Push] setupAndRegisterPushToken error:', err);
  }
}
