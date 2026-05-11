import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

export type PermissionStatus = 'granted' | 'denied' | 'not_determined';

export const permissionService = {
    async checkLocationPermission(): Promise<PermissionStatus> {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === Location.PermissionStatus.GRANTED) return 'granted';
            if (status === Location.PermissionStatus.DENIED) return 'denied';
            return 'not_determined';
        } catch {
            return 'not_determined';
        }
    },

    async requestLocationPermission(): Promise<PermissionStatus> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            return status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
        } catch {
            return 'denied';
        }
    },

    async ensureLocationPermission(): Promise<boolean> {
        try {
            const status = await this.checkLocationPermission();

            if (status === 'granted') {
                return true;
            }

            if (status === 'denied') {
                // Permission was previously denied
                return new Promise((resolve) => {
                    Alert.alert(
                        'Yêu cầu cấp quyền vị trí',
                        'Ứng dụng cần quyền vị trí để hoạt động bình thường. Vui lòng cấp quyền trong cài đặt ứng dụng.',
                        [
                            {
                                text: 'Mở cài đặt',
                                onPress: () => {
                                    Linking.openSettings();
                                    resolve(false);
                                }
                            },
                            {
                                text: 'Hủy',
                                onPress: () => resolve(false),
                                style: 'cancel'
                            }
                        ]
                    );
                });
            }

            // Permission not determined yet, request it
            const result = await this.requestLocationPermission();

            if (result !== 'granted') {
                // User denied the permission
                return new Promise((resolve) => {
                    Alert.alert(
                        'Yêu cầu cấp quyền vị trí',
                        'Vui lòng cấp quyền vị trí để ứng dụng có thể định vị vị trí của bạn.',
                        [
                            {
                                text: 'Thử lại',
                                onPress: async () => {
                                    const retryResult = await this.ensureLocationPermission();
                                    resolve(retryResult);
                                }
                            },
                            {
                                text: 'Hủy',
                                onPress: () => resolve(false),
                                style: 'cancel'
                            }
                        ]
                    );
                });
            }

            return true;
        } catch {
            return false;
        }
    }
};
