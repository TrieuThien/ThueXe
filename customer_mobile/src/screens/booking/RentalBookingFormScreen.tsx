import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AddressSuggestion } from "../../hooks";

import { AppHeader, AuthErrorNotice, PrimaryButton, TextField } from "../../components";
import { getRentalFlowErrorMessage, useAddressAutocomplete, useCurrentLocation } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRentalFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { reverseGeocodeToDisplayAddress } from "../../utils/address";
import { RentalBookingFormValues, rentalBookingFormSchema } from "../../validation/rentalSchemas";

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
  const location = useCurrentLocation(true);
  const selectedServiceType = useRentalFlowStore((state) => state.selectedServiceType);
  const setCriteria = useRentalFlowStore((state) => state.setCriteria);
  const setExtraInfo = useRentalFlowStore((state) => state.setExtraInfo);

  const initialStartAt = new Date();
  initialStartAt.setMinutes(0, 0, 0);
  initialStartAt.setHours(initialStartAt.getHours() + 1);

  const [startAtDate, setStartAtDate] = useState<Date>(initialStartAt);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(true);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(true);
  const pickupAutoFilledRef = useRef(false);
  // Tọa độ của địa chỉ đón được chọn từ autocomplete (không phải GPS hiện tại)
  const [selectedPickupCoord, setSelectedPickupCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RentalBookingFormValues>({
    resolver: zodResolver(rentalBookingFormSchema),
    defaultValues: {
      startAtText: "",
      durationHours: "4",
      pickupAddress: "",
      dropoffAddress: "",
      couponCode: "",
      note: "",
    },
  });

  useEffect(() => {
    setValue("startAtText", formatDateTimeInput(startAtDate), { shouldValidate: true });
  }, [setValue, startAtDate]);

  useEffect(() => {
    if (location.data?.address) {
      const currentPickup = getValues("pickupAddress");
      if (!currentPickup || pickupAutoFilledRef.current) {
        setValue("pickupAddress", location.data.address, { shouldValidate: true });
        pickupAutoFilledRef.current = true;
      }
    }
  }, [location.data?.address, setValue, getValues]);

  const pickupInput = watch("pickupAddress");
  const dropoffInput = watch("dropoffAddress");

  const pickupAutocomplete = useAddressAutocomplete(
    pickupInput ?? "",
    location.data
      ? {
          latitude: location.data.latitude,
          longitude: location.data.longitude,
        }
      : undefined,
  );

  const dropoffAutocomplete = useAddressAutocomplete(
    dropoffInput ?? "",
    location.data
      ? {
          latitude: location.data.latitude,
          longitude: location.data.longitude,
        }
      : undefined,
  );

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
      setCriteria({
        serviceType: selectedServiceType,
        startAt,
        durationHours: Number(values.durationHours),
        pickupAddress: values.pickupAddress,
        dropoffAddress: values.dropoffAddress || undefined,
        // Ưu tiên tọa độ của địa chỉ đón được chọn; fallback GPS nếu địa chỉ auto-fill từ GPS
        pickupCoordinate: selectedPickupCoord ?? (location.data
          ? { latitude: location.data.latitude, longitude: location.data.longitude }
          : undefined),
      });
      setExtraInfo(values.couponCode || undefined, values.note || undefined);
      navigation.navigate("RentalPackageList");
    } catch (error) {
      setError("root", { message: getRentalFlowErrorMessage(error) });
    }
  });

  const resolveSuggestionLabel = async (item: AddressSuggestion): Promise<string> => {
    if (typeof item.latitude !== "number" || typeof item.longitude !== "number") {
      return item.label;
    }

    try {
      const resolved = await reverseGeocodeToDisplayAddress(item.latitude, item.longitude);
      return resolved ?? item.label;
    } catch {
      return item.label;
    }
  };

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

        <Controller
          control={control}
          name="pickupAddress"
          render={({ field, fieldState }) => (
            <View style={styles.addressBlock}>
              <TextField
                label="Điểm đón"
                value={field.value}
                onChangeText={(text) => {
                  pickupAutoFilledRef.current = false;
                  setShowPickupSuggestions(true);
                  setSelectedPickupCoord(null); // xóa tọa độ cũ khi người dùng tự gõ
                  field.onChange(text);
                }}
                errorMessage={fieldState.error?.message}
              />

              {pickupAutocomplete.loading ? <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Đang gợi ý địa chỉ...</Text> : null}
              {!pickupAutocomplete.loading &&
              showPickupSuggestions &&
              (pickupInput ?? "").trim().length >= 2 &&
              pickupAutocomplete.suggestions.length === 0 ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Không tìm thấy gợi ý phù hợp</Text>
              ) : null}

              {showPickupSuggestions && pickupAutocomplete.suggestions.length > 0 ? (
                <View style={[styles.suggestionList, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  {pickupAutocomplete.suggestions.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={async () => {
                        pickupAutoFilledRef.current = false;
                        const nextLabel = await resolveSuggestionLabel(item);
                        setValue("pickupAddress", nextLabel, { shouldValidate: true });
                        // Lưu tọa độ của địa chỉ được chọn để dùng cho GIS filter
                        if (typeof item.latitude === "number" && typeof item.longitude === "number") {
                          setSelectedPickupCoord({ latitude: item.latitude, longitude: item.longitude });
                        }
                        setShowPickupSuggestions(false);
                      }}
                      style={[
                        styles.suggestionItem,
                        index === pickupAutocomplete.suggestions.length - 1 ? styles.suggestionItemLast : null,
                        { borderBottomColor: theme.colors.border },
                      ]}
                    >
                      <Text style={[styles.suggestionText, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="dropoffAddress"
          render={({ field, fieldState }) => (
            <View style={styles.addressBlock}>
              <TextField
                label="Điểm trả (tùy chọn)"
                value={field.value}
                onChangeText={(text) => {
                  setShowDropoffSuggestions(true);
                  field.onChange(text);
                }}
                errorMessage={fieldState.error?.message}
              />

              {dropoffAutocomplete.loading ? <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Đang gợi ý địa chỉ...</Text> : null}
              {!dropoffAutocomplete.loading &&
              showDropoffSuggestions &&
              (dropoffInput ?? "").trim().length >= 2 &&
              dropoffAutocomplete.suggestions.length === 0 ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Không tìm thấy gợi ý phù hợp</Text>
              ) : null}

              {showDropoffSuggestions && dropoffAutocomplete.suggestions.length > 0 ? (
                <View style={[styles.suggestionList, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
                  {dropoffAutocomplete.suggestions.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={async () => {
                        const nextLabel = await resolveSuggestionLabel(item);
                        setValue("dropoffAddress", nextLabel, { shouldValidate: true });
                        setShowDropoffSuggestions(false);
                      }}
                      style={[
                        styles.suggestionItem,
                        index === dropoffAutocomplete.suggestions.length - 1 ? styles.suggestionItemLast : null,
                        { borderBottomColor: theme.colors.border },
                      ]}
                    >
                      <Text style={[styles.suggestionText, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="couponCode"
          render={({ field }) => <TextField label="Mã giảm giá (tùy chọn)" value={field.value} onChangeText={field.onChange} />}
        />

        <Controller
          control={control}
          name="note"
          render={({ field }) => <TextField label="Ghi chú (tùy chọn)" value={field.value} onChangeText={field.onChange} />}
        />

        <AuthErrorNotice message={errors.root?.message} />

        <PrimaryButton title="Tìm gói phù hợp" onPress={onSubmit} />
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
  addressBlock: {
    gap: 6,
  },
  suggestionHint: {
    fontSize: 12,
  },
  suggestionList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    fontSize: 13,
  },
});
