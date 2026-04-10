import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { HomeScreen } from "../screens";
import { useTheme } from "../theme";
import { AccountStackNavigator } from "./AccountStackNavigator";
import { BookingStackNavigator } from "./BookingStackNavigator";
import { WalletStackNavigator } from "./WalletStackNavigator";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: "home-outline",
            Booking: "car-outline",
            Wallet: "wallet-outline",
            Account: "person-outline",
          };

          return <Ionicons name={iconMap[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Trang chủ" }} />
      <Tab.Screen
        name="Booking"
        component={BookingStackNavigator}
        options={{ title: "Đặt xe" }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.navigate("Booking", { screen: "BookingHome" });
          },
        })}
      />
      <Tab.Screen name="Wallet" component={WalletStackNavigator} options={{ title: "Ví" }} />
      <Tab.Screen name="Account" component={AccountStackNavigator} options={{ title: "Tài khoản" }} />
    </Tab.Navigator>
  );
}
