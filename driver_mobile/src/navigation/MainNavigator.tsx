import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  AccountStackParamList,
  DashboardStackParamList,
  HistoryStackParamList,
  MainTabParamList,
  WalletStackParamList,
  WorkStackParamList
} from '../types/navigation';
import { useDriverHireStore } from '../store/driverHireStore';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { PackagesScreen } from '../screens/rental/PackagesScreen';
import { WorkingStatusScreen } from '../screens/work/WorkingStatusScreen';
import { DriverScheduleScreen } from '../screens/work/DriverScheduleScreen';
import { CurrentTripScreen } from '../screens/trip/CurrentTripScreen';
import { TripCompletedSummaryScreen } from '../screens/trip/TripCompletedSummaryScreen';
import { RentalBookingDetailScreen } from '../screens/work/RentalBookingDetailScreen';
import { DriverHireActiveServiceScreen } from '../screens/work/DriverHireActiveServiceScreen';
import { DriverHireServiceSummaryScreen } from '../screens/work/DriverHireServiceSummaryScreen';
import { TripHistoryScreen } from '../screens/history/TripHistoryScreen';
import { TripHistoryDetailScreen } from '../screens/history/TripHistoryDetailScreen';
import { WalletIncomeScreen } from '../screens/wallet/WalletIncomeScreen';
import { WalletTopUpScreen } from '../screens/wallet/WalletTopUpScreen';
import { WalletTopUpPaymentScreen } from '../screens/wallet/WalletTopUpPaymentScreen';
import { WalletTopUpResultScreen } from '../screens/wallet/WalletTopUpResultScreen';
import { WalletWithdrawalScreen } from '../screens/wallet/WalletWithdrawalScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SupportScreen } from '../screens/support/SupportScreen';
import { SupportCreateTicketScreen } from '../screens/support/SupportCreateTicketScreen';
import { SupportChatScreen } from '../screens/support/SupportChatScreen';
import { NotificationsScreen } from '../screens/notification/NotificationsScreen';
import { NotificationDetailScreen } from '../screens/notification/NotificationDetailScreen';
import { NotificationBell } from '../components/common';
import { useUnreadNotificationsCountQuery } from '../hooks/useDriverQueries';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useRideRequests } from '../hooks/useRideRequests';
import { useRentRequests } from '../hooks/useRentRequests';
import RideRequestModal from '../screens/booking/RideRequestModal';
import RequestModal, { type RentRequest } from '../screens/rental/RequestModal';
import { setupAndRegisterPushToken } from '../services/notifications/pushNotificationService';

const Tab = createBottomTabNavigator<MainTabParamList>();

const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const WorkStack = createNativeStackNavigator<WorkStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();

const stackScreenOptions = {
  headerTitleAlign: 'left' as const,
  // statusBarTranslucent: false,
  statusBarStyle: 'dark' as const,
};

const iconByRoute: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  DashboardTab: 'grid-outline',
  WorkTab: 'flash-outline',
  HistoryTab: 'time-outline',
  WalletTab: 'wallet-outline',
  AccountTab: 'person-circle-outline'
};

const DashboardStackScreen = () => (
  <DashboardStack.Navigator screenOptions={stackScreenOptions}>
    <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'Dashboard' }} />
    <DashboardStack.Screen name="PackagesList" component={PackagesScreen} options={{ title: 'Đăng ký gói cho thuê' }} />
  </DashboardStack.Navigator>
);

const WorkStackScreen = () => (
  <WorkStack.Navigator screenOptions={stackScreenOptions}>
    <WorkStack.Screen name="WorkingStatus" component={WorkingStatusScreen} options={{ title: 'Trạng thái' }} />
    <WorkStack.Screen name="DriverSchedule" component={DriverScheduleScreen} options={{ title: 'Lịch cho thuê' }} />
    <WorkStack.Screen
      name="RentalBookingDetail"
      component={RentalBookingDetailScreen}
      options={{ title: 'Chi tiết chuyến đi' }}
    />
    <WorkStack.Screen name="CurrentTrip" component={CurrentTripScreen} options={{ title: 'Chuyến hiện tại' }} />
    <WorkStack.Screen
      name="TripCompletedSummary"
      component={TripCompletedSummaryScreen}
      options={{ title: 'Tóm tắt chuyến đi' }}
    />
    <WorkStack.Screen
      name="DriverHireActiveService"
      component={DriverHireActiveServiceScreen}
      options={{ title: 'Dịch vụ đang thực hiện', gestureEnabled: false }}
    />
    <WorkStack.Screen
      name="DriverHireServiceSummary"
      component={DriverHireServiceSummaryScreen}
      options={{ title: 'Tổng kết dịch vụ', gestureEnabled: false }}
    />
  </WorkStack.Navigator>
);

const HistoryStackScreen = () => (
  <HistoryStack.Navigator screenOptions={stackScreenOptions}>
    <HistoryStack.Screen name="TripHistory" component={TripHistoryScreen} options={{ title: 'Lịch sử' }} />
    <HistoryStack.Screen name="TripHistoryDetail" component={TripHistoryDetailScreen} options={{ title: 'Chi tiết chuyến đi' }} />
  </HistoryStack.Navigator>
);

const WalletStackScreen = () => (
  <WalletStack.Navigator screenOptions={stackScreenOptions}>
    <WalletStack.Screen name="WalletIncome" component={WalletIncomeScreen} options={{ title: 'Ví và thu nhập' }} />
    <WalletStack.Screen name="WalletTopUp" component={WalletTopUpScreen} options={{ title: 'Nạp tiền' }} />
    <WalletStack.Screen
      name="WalletTopUpPayment"
      component={WalletTopUpPaymentScreen}
      options={{ title: 'Thanh toán' }}
    />
    <WalletStack.Screen name="WalletTopUpResult" component={WalletTopUpResultScreen} options={{ title: 'Kết quả' }} />
    <WalletStack.Screen name="WalletWithdrawal" component={WalletWithdrawalScreen} options={{ title: 'Rút tiền' }} />
  </WalletStack.Navigator>
);

const AccountStackScreen = () => (
  <AccountStack.Navigator screenOptions={stackScreenOptions}>
    <AccountStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
    <AccountStack.Screen name="Support" component={SupportScreen} options={{ title: 'Hỗ trợ' }} />
    <AccountStack.Screen
      name="SupportCreateTicket"
      component={SupportCreateTicketScreen}
      options={{ title: 'Tạo yêu cầu' }}
    />
    <AccountStack.Screen name="SupportChat" component={SupportChatScreen} options={{ title: 'Chat hỗ trợ' }} />
    <AccountStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
    <AccountStack.Screen
      name="NotificationDetail"
      component={NotificationDetailScreen}
      options={{ title: 'Chi tiết thông báo' }}
    />
  </AccountStack.Navigator>
);

export const MainNavigator = () => {
  const insets = useSafeAreaInsets();
  useUnreadNotificationsCountQuery();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const accessToken = useAuthStore((state) => state.tokens?.accessToken ?? null);
  const { rideRequest, dismissRideRequest } = useRideRequests(accessToken);
  const { rentRequest, dismissRentRequest } = useRentRequests(accessToken);
  const setPendingRentalNav = useDriverHireStore((state) => state.setPendingRentalNav);

  // Push notification: request received while app is background/killed
  const [notifRentRequest, setNotifRentRequest] = useState<RentRequest | null>(null);
  const notifListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Register push token once per login session
    setupAndRegisterPushToken();

    // Handle notification TAP (background → foreground, or killed → foreground)
    notifListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === 'NEW_DRIVER_RENT_REQUEST') {
        setNotifRentRequest(data as unknown as RentRequest);
      }
    });

    // Handle notification tap when app was fully killed
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === 'NEW_DRIVER_RENT_REQUEST') {
        setNotifRentRequest(data as unknown as RentRequest);
      }
    });

    return () => {
      notifListenerRef.current?.remove();
    };
  }, [accessToken]);

  const effectiveRentRequest = rentRequest ?? notifRentRequest;
  const dismissEffectiveRentRequest = useCallback(() => {
    dismissRentRequest();
    setNotifRentRequest(null);
  }, [dismissRentRequest]);

  // Lưu pending navigation vào store; WorkingStatusScreen sẽ xử lý navigate thực tế
  const handleRentAccepted = useCallback((bookingId: number) => {
    setPendingRentalNav({
      rentalId: String(bookingId),
      pickupLat: effectiveRentRequest?.pickup_lat,
      pickupLng: effectiveRentRequest?.pickup_lng,
    });
  }, [effectiveRentRequest, setPendingRentalNav]);

  return (
    <>
    <RideRequestModal request={rideRequest} onClose={dismissRideRequest} />
    <RequestModal request={effectiveRentRequest} onClose={dismissEffectiveRentRequest} onAccepted={handleRentAccepted} />
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
      headerTitleAlign: 'center',
      tabBarStyle: {
        height: 58 + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 8
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '700'
      },
      tabBarIcon: ({ color, size }) => <Ionicons name={iconByRoute[route.name]} size={size} color={color} />,
      tabBarBadge:
        route.name === 'AccountTab' && unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('AccountTab', { screen: 'Notifications' })}
          style={{ marginRight: 10 }}
        >
          <NotificationBell color="#0F172A" size={20} />
        </Pressable>
      )
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStackScreen} options={{ title: 'Tổng quan', headerShown: false }} />
      <Tab.Screen name="WorkTab" component={WorkStackScreen} options={{ title: 'Làm việc', headerShown: false }} />
      <Tab.Screen name="HistoryTab" component={HistoryStackScreen} options={{ title: 'Lịch sử', headerShown: false }} />
      <Tab.Screen name="WalletTab" component={WalletStackScreen} options={{ title: 'Thu nhập', headerShown: false }} />
      <Tab.Screen name="AccountTab" component={AccountStackScreen} options={{ title: 'Tài khoản', headerShown: false }} />
    </Tab.Navigator>
    </>
  );
};
