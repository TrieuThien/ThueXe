import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, AuthErrorNotice, PrimaryButton, TextField } from "../../components";
import { getRentalFlowErrorMessage } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { RentalBookingDateTimeFormValues, rentalBookingDateTimeSchema } from "../../validation/rentalSchemas";

type Props = NativeStackScreenProps<BookingStackParamList, "RentalBookingForm">;

function formatDateTimeInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function RentalBookingFormScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const selectedServiceType = useRentalFlowStore((state) => state.selectedServiceType);
  const setCriteria = useRentalFlowStore((state) => state.setCriteria);

  const initialStartAt = new Date();
  initialStartAt.setMinutes(0, 0, 0);
  initialStartAt.setHours(initialStartAt.getHours() + 1);

  const [startAtDate, setStartAtDate] = useState<Date>(initialStartAt);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<RentalBookingDateTimeFormValues>({
    resolver: zodResolver(rentalBookingDateTimeSchema),
    defaultValues: {
      startAtText: "",
      durationHours: "4",
    },
  });

  useEffect(() => {
    setValue("startAtText", formatDateTimeInput(startAtDate), { shouldValidate: true });
  }, [setValue, startAtDate]);

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (!selectedDate) {
      return;
    }

    const next = new Date(startAtDate);
    next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    setStartAtDate(next);
  };

  const onTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (!selectedTime) {
      return;
    }

    const next = new Date(startAtDate);
    next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setStartAtDate(next);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedServiceType) {
      setError("root", { message: "Vui lòng chọn loại dịch vụ." });
      return;
    }

    try {
      const startAt = new Date(values.startAtText.replace(" ", "T")).toISOString();
      // Store the date/time/duration in the rental flow store
      setCriteria({
        serviceType: selectedServiceType,
        startAt,
        durationHours: Number(values.durationHours),
        pickupAddress: "",
        dropoffAddress: undefined,
        pickupCoordinate: undefined,
      });
      // Navigate to pickup location screen
      navigation.navigate("RentalLocationPickup");
    } catch (error) {
      console.error("Booking form error:", error);
      setError("root", { message: getRentalFlowErrorMessage(error) });
    }
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Thông tin thuê" />
      <ScrollView contentContainerStyle={styles.container}>
        <Controller
          control={control}
          name="startAtText"
          render={({ field, fieldState }) => (
            <View style={styles.dateTimeBlock}>
              <TextField
                label="Ngày giờ bắt đầu"
                value={field.value}
                editable={false}
                placeholder="YYYY-MM-DD HH:mm"
                errorMessage={fieldState.error?.message}
              />
              <View style={styles.dateTimeActions}>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.dateTimeButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                >
                  <Text style={[styles.dateTimeButtonText, { color: theme.colors.text }]}>Chọn ngày</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={[styles.dateTimeButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                >
                  <Text style={[styles.dateTimeButtonText, { color: theme.colors.text }]}>Chọn giờ</Text>
                </Pressable>
              </View>
            </View>
          )}
        />

        {showDatePicker ? (
          <DateTimePicker value={startAtDate} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
        ) : null}

        {showTimePicker ? (
          <DateTimePicker value={startAtDate} mode="time" display="default" onChange={onTimeChange} />
        ) : null}

        <Controller
          control={control}
          name="durationHours"
          render={({ field, fieldState }) => (
            <TextField
              label="Thời lượng (giờ)"
              value={field.value}
              onChangeText={field.onChange}
              keyboardType="numeric"
              errorMessage={fieldState.error?.message}
            />
          )}
        />

        <AuthErrorNotice message={errors.root?.message} />

        <PrimaryButton title="Tiếp tục" onPress={onSubmit} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  dateTimeBlock: {
    gap: 8,
  },
  dateTimeActions: {
    flexDirection: "row",
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dateTimeButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
