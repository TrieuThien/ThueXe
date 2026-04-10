import { StyleSheet, Text, View } from "react-native";

import { TRIP_STATUS_LABELS } from "../../constants";
import { TripStatus } from "../../types";
import { useTheme } from "../../theme";

interface TripStatusStepperProps {
  steps: TripStatus[];
  currentStepIndex: number;
}

export function TripStatusStepper({ steps, currentStepIndex }: TripStatusStepperProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const active = index <= currentStepIndex;
        return (
          <View key={step} style={styles.stepItem}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surfaceMuted,
                },
              ]}
            />
            <Text style={[styles.label, { color: active ? theme.colors.text : theme.colors.textMuted }]} numberOfLines={2}>
              {TRIP_STATUS_LABELS[step]}
            </Text>
            {index < steps.length - 1 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: index < currentStepIndex ? theme.colors.primary : theme.colors.border },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    gap: 8,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  label: {
    fontSize: 12,
    width: 92,
  },
  line: {
    flex: 1,
    height: 2,
    borderRadius: 999,
  },
});
