import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, HeaderTextButton } from "../../components";
import { AccountStackParamList, MainTabParamList, RootStackParamList } from "../../navigation";
import { useAppStore, useAuthStore } from "../../store";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<AccountStackParamList, "AccountMain">;

export function AccountScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const tabNavigation = useNavigation<NavigationProp<MainTabParamList>>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);

  const rewardPoints = currentUser?.rewardPoints ?? 0;

  const handleToggleTheme = () => {
    setThemeMode(themeMode === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    clearSession();
    void queryClient.clear();

    const rootNavigation = navigation.getParent()?.getParent() as NavigationProp<RootStackParamList> | undefined;
    rootNavigation?.navigate("Auth", { screen: "Login" });
  };

  const actions: Array<{
    id: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    iconColor?: string;
  }> = [
      {
        id: "profile",
        title: "Hồ sơ",
        icon: "person-circle-outline",
        onPress: () => navigation.navigate("AccountProfile"),
      },
      {
        id: "ride-history",
        title: "Lịch sử gọi xe",
        icon: "car-outline",
        onPress: () => tabNavigation.navigate("Booking", { screen: "TripHistoryList" }),
      },
      {
        id: "rental-car-history",
        title: "Lịch sử thuê xe",
        icon: "time-outline",
        onPress: () => tabNavigation.navigate("Booking", { screen: "RentalHistory" }),
      },
      {
        id: "driver-hire-history",
        title: "Lịch sử thuê tài xế",
        icon: "people-outline",
        onPress: () => tabNavigation.navigate("Booking", { screen: "DriverHireHistory" }),
      },
      {
        id: "logout",
        title: "Đăng xuất",
        icon: "log-out-outline",
        onPress: handleLogout,
        iconColor: theme.colors.danger,
      },
    ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Tài khoản"
        rightAction={
          <HeaderTextButton
            label={
              <Ionicons
                name={themeMode === "light" ? "moon-outline" : "sunny-outline"}
                size={20}
                color={theme.colors.text}
              />
            }
            onPress={handleToggleTheme}
          />
        }
      />

      <View style={styles.container}>
        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {currentUser?.avatarUrl ? (
            <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.avatarText, { color: theme.colors.text }]}>{(currentUser?.fullName?.[0] ?? "K").toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: theme.colors.text }]}>{currentUser?.fullName ?? "Khách hàng"}</Text>
            <Text style={[styles.subText, { color: theme.colors.textMuted }]}>{currentUser?.phoneNumber ?? "--"}</Text>
            <Text style={[styles.subText, { color: theme.colors.textMuted }]}>{currentUser?.email ?? "--"}</Text>
          </View>

          <View style={[styles.pointsBox, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.pointsLabel, { color: theme.colors.textMuted }]}>Điểm tích lũy</Text>
            <Text style={[styles.pointsValue, { color: theme.colors.primary }]}>{rewardPoints.toLocaleString("vi-VN")}</Text>
          </View>
        </View>

        <View style={styles.actionList}>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              onPress={action.onPress}
              style={[
                styles.actionItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.actionLeft}>
                <Ionicons name={action.icon} size={22} color={action.iconColor ?? theme.colors.primary} />
                <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{action.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 14,
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  subText: {
    fontSize: 12,
  },
  pointsBox: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "flex-end",
    gap: 2,
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  actionList: {
    gap: 10,
  },
  actionItem: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
});
