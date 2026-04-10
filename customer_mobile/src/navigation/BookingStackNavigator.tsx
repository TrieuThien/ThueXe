import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  BookingDetailScreen,
  BookingHistoryScreen,
  BookingHomeScreen,
  RentalBookingConfirmScreen,
  RentalBookingFormScreen,
  RentalBookingSuccessScreen,
  RentalPackageListScreen,
  RentalServiceChooserScreen,
  RideBookingConfirmScreen,
  RideLocationPickerScreen,
  RideSearchingDriverScreen,
  RideVehicleSelectionScreen,
} from "../screens";
import { ActiveTripScreen } from "../screens/trip/ActiveTripScreen";
import { DriverTrackingMapScreen } from "../screens/trip/DriverTrackingMapScreen";
import { TripChatScreen } from "../screens/trip/TripChatScreen";
import { TripDetailScreen } from "../screens/trip/TripDetailScreen";
import { TripHistoryDetailScreen } from "../screens/trip/TripHistoryDetailScreen";
import { TripHistoryListScreen } from "../screens/trip/TripHistoryListScreen";
import { BookingStackParamList } from "./types";

const Stack = createNativeStackNavigator<BookingStackParamList>();

export function BookingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingHome" component={BookingHomeScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="TripChat" component={TripChatScreen} />
      <Stack.Screen name="DriverTrackingMap" component={DriverTrackingMapScreen} />
      <Stack.Screen name="TripHistoryList" component={TripHistoryListScreen} />
      <Stack.Screen name="TripHistoryDetail" component={TripHistoryDetailScreen} />
      <Stack.Screen name="RentalServiceChooser" component={RentalServiceChooserScreen} />
      <Stack.Screen name="RentalBookingForm" component={RentalBookingFormScreen} />
      <Stack.Screen name="RentalPackageList" component={RentalPackageListScreen} />
      <Stack.Screen name="RentalBookingConfirm" component={RentalBookingConfirmScreen} />
      <Stack.Screen name="RentalBookingSuccess" component={RentalBookingSuccessScreen} />
      <Stack.Screen name="RideLocationPicker" component={RideLocationPickerScreen} />
      <Stack.Screen name="RideVehicleSelection" component={RideVehicleSelectionScreen} />
      <Stack.Screen name="RideBookingConfirm" component={RideBookingConfirmScreen} />
      <Stack.Screen name="RideSearchingDriver" component={RideSearchingDriverScreen} />
      <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    </Stack.Navigator>
  );
}
