import { Pressable, StyleSheet, Text, View } from "react-native";

import { RidePaymentMethodOption } from "../../types";
import { useTheme } from "../../theme";

interface PaymentMethodSelectorProps {
  methods: RidePaymentMethodOption[];
  selectedId?: string;
  onSelect: (paymentMethodId: string) => void;
}

export function PaymentMethodSelector({ methods, selectedId, onSelect }: PaymentMethodSelectorProps) {
  const { theme } = useTheme();
  const safeMethods = Array.isArray(methods) ? methods : [];

  return (
    <View style={styles.container}>
      {safeMethods.map((method) => {
        const selected = selectedId === method.id;
        return (
          <Pressable
            key={method.id}
            onPress={() => onSelect(method.id)}
            style={[
              styles.card,
              {
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Text style={[styles.name, { color: theme.colors.text }]}>{method.displayName}</Text>
            {method.subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{method.subtitle}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
  },
});
