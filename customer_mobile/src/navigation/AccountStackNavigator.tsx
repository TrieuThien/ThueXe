import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AccountProfileScreen, AccountScreen } from "../screens";
import { AccountStackParamList } from "./types";

const Stack = createNativeStackNavigator<AccountStackParamList>();

export function AccountStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountMain" component={AccountScreen} />
      <Stack.Screen name="AccountProfile" component={AccountProfileScreen} />
    </Stack.Navigator>
  );
}
