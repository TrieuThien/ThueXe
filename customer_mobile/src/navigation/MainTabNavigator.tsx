import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { HomeScreen } from "../screens";
import { useAuthStore } from "../store";
import { useTheme } from "../theme";
import { AccountStackNavigator } from "./AccountStackNavigator";
import { BookingStackNavigator } from "./BookingStackNavigator";
import { WalletStackNavigator } from "./WalletStackNavigator";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { theme } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthLogin = (navigation: { getParent: () => unknown }) => {
    const parent = navigation.getParent() as { navigate: (name: string, params?: unknown) => void } | null;
    parent?.navigate("Auth", { screen: "Login" });
  };

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
            if (!isAuthenticated) {
              openAuthLogin(navigation);
              return;
            }
            navigation.navigate("Booking", { screen: "BookingHome" });
          },
        })}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletStackNavigator}
        options={{ title: "Ví" }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            if (isAuthenticated) {
              return;
            }
            event.preventDefault();
            openAuthLogin(navigation);
          },
        })}
      />
      <Tab.Screen
        name="Account"
        component={AccountStackNavigator}
        options={{ title: "Tài khoản" }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            if (isAuthenticated) {
              return;
            }
            event.preventDefault();
            openAuthLogin(navigation);
          },
        })}
      />
    </Tab.Navigator>
  );
}
