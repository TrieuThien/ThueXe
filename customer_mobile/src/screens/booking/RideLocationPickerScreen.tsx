import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AddressSuggestion } from "../../hooks";

import {
  AppHeader,
  AuthErrorNotice,
  PrimaryButton,
  RideRouteMap,
  RouteSummaryCard,
  TextField,
} from "../../components";
import {
  getRideFlowErrorMessage,
  useAddressAutocomplete,
  useCurrentLocation,
  useRideRouteEstimateMutation,
} from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useRideFlowStore } from "../../store";
import { useTheme } from "../../theme";
import { reverseGeocodeToDisplayAddress } from "../../utils/address";
import { RideLocationFormValues, rideLocationSchema } from "../../validation/rideSchemas";

type Props = NativeStackScreenProps<BookingStackParamList, "RideLocationPicker">;

function formatDateTimeInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function RideLocationPickerScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const location = useCurrentLocation(true);
  const routeMutation = useRideRouteEstimateMutation();
  const setLocationDraft = useRideFlowStore((state) => state.setLocationDraft);
  const routeEstimate = useRideFlowStore((state) => state.routeEstimate);

  const initialScheduledAt = new Date();
  initialScheduledAt.setMinutes(0, 0, 0);
  initialScheduledAt.setHours(initialScheduledAt.getHours() + 1);

  const [scheduledAtDate, setScheduledAtDate] = useState<Date>(initialScheduledAt);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(true);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(true);
  const [showStop1Suggestions, setShowStop1Suggestions] = useState(true);
  const [showStop2Suggestions, setShowStop2Suggestions] = useState(true);
  const pickupAutoFilledRef = useRef(false);

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RideLocationFormValues>({
    defaultValues: {
      pickupAddress: "",
      destinationAddress: "",
      stop1: "",
      stop2: "",
      isScheduled: false,
      scheduledAtText: "",
    },
    resolver: zodResolver(rideLocationSchema),
  });

  const isScheduled = watch("isScheduled");
  const pickupInput = watch("pickupAddress");
  const destinationInput = watch("destinationAddress");
  const stop1Input = watch("stop1");
  const stop2Input = watch("stop2");

  const locationBias = location.data
    ? {
        latitude: location.data.latitude,
        longitude: location.data.longitude,
      }
    : undefined;

  const pickupAutocomplete = useAddressAutocomplete(pickupInput ?? "", locationBias);
  const destinationAutocomplete = useAddressAutocomplete(destinationInput ?? "", locationBias);
  const stop1Autocomplete = useAddressAutocomplete(stop1Input ?? "", locationBias);
  const stop2Autocomplete = useAddressAutocomplete(stop2Input ?? "", locationBias);

  useEffect(() => {
    setValue("scheduledAtText", formatDateTimeInput(scheduledAtDate), { shouldValidate: true });
  }, [scheduledAtDate, setValue]);

  useEffect(() => {
    if (location.data?.address) {
      const currentPickup = getValues("pickupAddress");
      if (!currentPickup || pickupAutoFilledRef.current) {
        setValue("pickupAddress", location.data.address, { shouldValidate: true });
        pickupAutoFilledRef.current = true;
      }
    }
  }, [location.data?.address, setValue, getValues]);

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (!selectedDate) {
      return;
    }

    const next = new Date(scheduledAtDate);
    next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    setScheduledAtDate(next);
  };

  const onTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (!selectedTime) {
      return;
    }

    const next = new Date(scheduledAtDate);
    next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setScheduledAtDate(next);
  };

  const onEstimateRoute = handleSubmit(async (values) => {
    try {
      const stopAddresses = [values.stop1, values.stop2].filter((item): item is string => Boolean(item?.trim()));
      const scheduledAt =
        values.isScheduled && values.scheduledAtText
          ? new Date(values.scheduledAtText.replace(" ", "T")).toISOString()
          : undefined;

      const route = await routeMutation.mutateAsync({
        pickupAddress: values.pickupAddress,
        destinationAddress: values.destinationAddress,
        stopAddresses,
        scheduledAt,
        currentLocation: location.data
          ? {
              latitude: location.data.latitude,
              longitude: location.data.longitude,
            }
          : undefined,
      });

      setLocationDraft({
        pickupAddress: values.pickupAddress,
        destinationAddress: values.destinationAddress,
        stopAddresses,
        isScheduled: values.isScheduled,
        scheduledAt,
        currentLocation: location.data
          ? {
              latitude: location.data.latitude,
              longitude: location.data.longitude,
            }
          : undefined,
        routeEstimate: route,
      });
    } catch (error) {
      setError("root", { message: getRideFlowErrorMessage(error) });
    }
  });

  const onGoNext = () => {
    navigation.navigate("RideVehicleSelection");
  };

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
      <AppHeader title="Chọn lộ trình" />
      <ScrollView contentContainerStyle={styles.container}>
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
                  field.onChange(text);
                }}
                errorMessage={fieldState.error?.message}
                placeholder="Nhập điểm đón"
              />

              {pickupAutocomplete.loading ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Đang gợi ý địa chỉ...</Text>
              ) : null}

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
          name="destinationAddress"
          render={({ field, fieldState }) => (
            <View style={styles.addressBlock}>
              <TextField
                label="Điểm đến"
                value={field.value}
                onChangeText={(text) => {
                  setShowDestinationSuggestions(true);
                  field.onChange(text);
                }}
                errorMessage={fieldState.error?.message}
                placeholder="Nhập điểm đến"
              />

              {destinationAutocomplete.loading ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Đang gợi ý địa chỉ...</Text>
              ) : null}

              {!destinationAutocomplete.loading &&
              showDestinationSuggestions &&
              (destinationInput ?? "").trim().length >= 2 &&
              destinationAutocomplete.suggestions.length === 0 ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Không tìm thấy gợi ý phù hợp</Text>
              ) : null}

              {showDestinationSuggestions && destinationAutocomplete.suggestions.length > 0 ? (
                <View style={[styles.suggestionList, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
                  {destinationAutocomplete.suggestions.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={async () => {
                        const nextLabel = await resolveSuggestionLabel(item);
                        setValue("destinationAddress", nextLabel, { shouldValidate: true });
                        setShowDestinationSuggestions(false);
                      }}
                      style={[
                        styles.suggestionItem,
                        index === destinationAutocomplete.suggestions.length - 1 ? styles.suggestionItemLast : null,
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
          name="stop1"
          render={({ field, fieldState }) => (
            <View style={styles.addressBlock}>
              <TextField
                label="Điểm dừng 1 (tùy chọn)"
                value={field.value}
                onChangeText={(text) => {
                  setShowStop1Suggestions(true);
                  field.onChange(text);
                }}
                errorMessage={fieldState.error?.message}
                placeholder="Thêm điểm dừng"
              />

              {stop1Autocomplete.loading ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Đang gợi ý địa chỉ...</Text>
              ) : null}

              {!stop1Autocomplete.loading &&
              showStop1Suggestions &&
              (stop1Input ?? "").trim().length >= 2 &&
              stop1Autocomplete.suggestions.length === 0 ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Không tìm thấy gợi ý phù hợp</Text>
              ) : null}

              {showStop1Suggestions && stop1Autocomplete.suggestions.length > 0 ? (
                <View style={[styles.suggestionList, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
                  {stop1Autocomplete.suggestions.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={async () => {
                        const nextLabel = await resolveSuggestionLabel(item);
                        setValue("stop1", nextLabel, { shouldValidate: true });
                        setShowStop1Suggestions(false);
                      }}
                      style={[
                        styles.suggestionItem,
                        index === stop1Autocomplete.suggestions.length - 1 ? styles.suggestionItemLast : null,
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
          name="stop2"
          render={({ field, fieldState }) => (
            <View style={styles.addressBlock}>
              <TextField
                label="Điểm dừng 2 (tùy chọn)"
                value={field.value}
                onChangeText={(text) => {
                  setShowStop2Suggestions(true);
                  field.onChange(text);
                }}
                errorMessage={fieldState.error?.message}
                placeholder="Tối đa 2 điểm dừng"
              />

              {stop2Autocomplete.loading ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Đang gợi ý địa chỉ...</Text>
              ) : null}

              {!stop2Autocomplete.loading &&
              showStop2Suggestions &&
              (stop2Input ?? "").trim().length >= 2 &&
              stop2Autocomplete.suggestions.length === 0 ? (
                <Text style={[styles.suggestionHint, { color: theme.colors.textMuted }]}>Không tìm thấy gợi ý phù hợp</Text>
              ) : null}

              {showStop2Suggestions && stop2Autocomplete.suggestions.length > 0 ? (
                <View style={[styles.suggestionList, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
                  {stop2Autocomplete.suggestions.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={async () => {
                        const nextLabel = await resolveSuggestionLabel(item);
                        setValue("stop2", nextLabel, { shouldValidate: true });
                        setShowStop2Suggestions(false);
                      }}
                      style={[
                        styles.suggestionItem,
                        index === stop2Autocomplete.suggestions.length - 1 ? styles.suggestionItemLast : null,
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

        <View style={styles.scheduleRow}>
          <PrimaryButton
            title={isScheduled ? "Bỏ hẹn giờ" : "Hẹn giờ"}
            onPress={() => {
              const next = !isScheduled;
              setValue("isScheduled", next);
            }}
            style={styles.scheduleButton}
          />
          <Text style={[styles.scheduleHint, { color: theme.colors.textMuted }]}>Đặt ngay hoặc hẹn giờ khởi hành</Text>
        </View>

        {isScheduled ? (
          <Controller
            control={control}
            name="scheduledAtText"
            render={({ field, fieldState }) => (
              <View style={styles.dateTimeBlock}>
                <TextField
                  label="Thời gian hẹn giờ"
                  value={field.value}
                  editable={false}
                  errorMessage={fieldState.error?.message}
                  placeholder="YYYY-MM-DD HH:mm"
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
        ) : null}

        {showDatePicker ? (
          <DateTimePicker value={scheduledAtDate} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
        ) : null}

        {showTimePicker ? (
          <DateTimePicker value={scheduledAtDate} mode="time" display="default" onChange={onTimeChange} />
        ) : null}

        <AuthErrorNotice message={errors.root?.message} />

        <PrimaryButton
          title="Tính quãng đường và ETA"
          onPress={onEstimateRoute}
          loading={routeMutation.isPending}
        />

        {routeEstimate ? (
          <>
            <RideRouteMap
              pickup={routeEstimate.pickup.coordinate}
              destination={routeEstimate.destination.coordinate}
              stops={routeEstimate.stops.map((item) => item.coordinate)}
              polylineCoordinates={routeEstimate.polylineCoordinates}
            />
            <RouteSummaryCard route={routeEstimate} />
            <PrimaryButton title="Tiếp tục chọn xe" onPress={onGoNext} />
          </>
        ) : (
          <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>Nhập thông tin và bấm tính lộ trình để tiếp tục.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
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
  scheduleRow: {
    gap: 6,
  },
  scheduleButton: {
    alignSelf: "flex-start",
    minWidth: 120,
  },
  scheduleHint: {
    fontSize: 12,
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
  helperText: {
    fontSize: 13,
    textAlign: "center",
  },
});
