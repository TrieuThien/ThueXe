import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  BookingDetailScreen,
  BookingHistoryScreen,
  BookingHomeScreen,
  DriverHireHistoryScreen,
  RentalBookingConfirmScreen,
  RentalBookingDetailScreen,
  RentalBookingFormScreen,
  RentalBookingSuccessScreen,
  RentalCarDetailScreen,
  RentalHistoryScreen,
  RentalLocationMapPickerScreen,
  RentalLocationPickupScreen,
  RentalLocationDropoffScreen,
  RentalPackageCarsScreen,
  RentalPackageListScreen,
  RentalServiceChooserScreen,
  RentalVehicleConfirmScreen,
  RideBookingConfirmScreen,
  RideLocationPickerScreen,
  RideLocationPickupScreen,
  RideLocationDropoffScreen,
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
      <Stack.Screen name="RentalLocationPickup" component={RentalLocationPickupScreen} />
      <Stack.Screen name="RentalLocationDropoff" component={RentalLocationDropoffScreen} />
      <Stack.Screen name="RentalLocationMapPicker" component={RentalLocationMapPickerScreen} />
      <Stack.Screen name="RentalPackageList" component={RentalPackageListScreen} />
      <Stack.Screen name="RentalPackageCars" component={RentalPackageCarsScreen} />
      <Stack.Screen name="RentalCarDetail" component={RentalCarDetailScreen} />
      <Stack.Screen name="RentalVehicleConfirm" component={RentalVehicleConfirmScreen} />
      <Stack.Screen name="RentalBookingConfirm" component={RentalBookingConfirmScreen} />
      <Stack.Screen name="RentalBookingDetail" component={RentalBookingDetailScreen} />
      <Stack.Screen name="RentalBookingSuccess" component={RentalBookingSuccessScreen} />
      <Stack.Screen name="RideLocationPickup" component={RideLocationPickupScreen} />
      <Stack.Screen name="RideLocationDropoff" component={RideLocationDropoffScreen} />
      <Stack.Screen name="RideVehicleSelection" component={RideVehicleSelectionScreen} />
      <Stack.Screen name="RideBookingConfirm" component={RideBookingConfirmScreen} />
      <Stack.Screen name="RideSearchingDriver" component={RideSearchingDriverScreen} />
      <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
      <Stack.Screen name="RentalHistory" component={RentalHistoryScreen} />
      <Stack.Screen name="DriverHireHistory" component={DriverHireHistoryScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    </Stack.Navigator>
  );
}
