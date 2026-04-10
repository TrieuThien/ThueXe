import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  PaymentMethodScreen,
  TopUpWalletScreen,
  TransactionHistoryScreen,
  WalletScreen,
  WithdrawalRequestScreen,
} from "../screens";
import { WalletStackParamList } from "./types";

const Stack = createNativeStackNavigator<WalletStackParamList>();

export function WalletStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WalletMain" component={WalletScreen} />
      <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
      <Stack.Screen name="TopUpWallet" component={TopUpWalletScreen} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      <Stack.Screen name="WithdrawalRequest" component={WithdrawalRequestScreen} />
    </Stack.Navigator>
  );
}
