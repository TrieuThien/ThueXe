import { Pressable, StyleSheet, Text, View } from "react-native";

import { FeaturedCoupon } from "../../types";
import { useTheme } from "../../theme";

interface FeaturedCouponCardProps {
  coupon: FeaturedCoupon;
  onPress: (coupon: FeaturedCoupon) => void;
}

export function FeaturedCouponCard({ coupon, onPress }: FeaturedCouponCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(coupon)}
      style={[styles.container, { borderColor: theme.colors.secondary, backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.row}>
        <Text style={[styles.code, { color: theme.colors.secondary }]}>{coupon.code}</Text>
        <Text style={[styles.discount, { color: theme.colors.success }]}>{coupon.discountText}</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{coupon.title}</Text>
      <Text style={[styles.description, { color: theme.colors.textMuted }]}>{coupon.description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  code: {
    fontSize: 13,
    fontWeight: "800",
  },
  discount: {
    fontSize: 15,
    fontWeight: "800",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
  },
});
