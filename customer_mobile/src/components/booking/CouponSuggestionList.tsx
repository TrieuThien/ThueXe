import { Pressable, StyleSheet, Text, View } from "react-native";

import { RideCouponPreview } from "../../types";
import { useTheme } from "../../theme";

interface CouponSuggestionListProps {
  coupons: RideCouponPreview[];
  onSelectCoupon: (couponCode: string) => void;
}

export function CouponSuggestionList({ coupons, onSelectCoupon }: CouponSuggestionListProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {coupons.map((coupon) => (
        <Pressable
          key={coupon.code}
          onPress={() => onSelectCoupon(coupon.code)}
          style={[styles.card, { borderColor: theme.colors.secondary, backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.code, { color: theme.colors.secondary }]}>{coupon.code}</Text>
          <Text style={[styles.desc, { color: theme.colors.textMuted }]}>{coupon.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  code: {
    fontSize: 13,
    fontWeight: "800",
  },
  desc: {
    fontSize: 12,
  },
});
