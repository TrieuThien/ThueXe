/**
 * expoPush.js
 * Wrapper gửi Expo push notification đến driver/user.
 * Dùng expo-server-sdk; token phải là ExponentPushToken[xxx].
 */

import { Expo } from "expo-server-sdk";

const expo = new Expo({ useFcmV1: true });

/**
 * Gửi một push notification đến thiết bị qua Expo push service.
 *
 * @param {string} token - ExponentPushToken từ cột push_notification_token
 * @param {{ title: string; body: string; data?: object; sound?: string; channelId?: string }} opts
 */
export async function sendExpoPush(token, { title, body, data = {}, sound = "default", channelId }) {
    if (!Expo.isExpoPushToken(token)) {
        console.warn(`[ExpoPush] Invalid token skipped: ${token}`);
        return;
    }

    const message = {
        to: token,
        sound,
        title,
        body,
        data,
        priority: "high",
        ...(channelId ? { channelId } : {}),
    };

    try {
        const chunks = expo.chunkPushNotifications([message]);
        for (const chunk of chunks) {
            const receipts = await expo.sendPushNotificationsAsync(chunk);
            for (const receipt of receipts) {
                if (receipt.status === "error") {
                    console.error(`[ExpoPush] Receipt error: ${receipt.message}`, receipt.details);
                }
            }
        }
    } catch (err) {
        console.error("[ExpoPush] send failed:", err.message);
    }
}
