import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, EmptyState, ErrorState, LoadingState, TripChatComposer, TripMessageBubble } from "../../components";
import { useSendTripMessageMutation, useTripChatThreadQuery, useTripDetailQuery } from "../../hooks";
import { BookingStackParamList } from "../../navigation";
import { useTheme } from "../../theme";

type Props = NativeStackScreenProps<BookingStackParamList, "TripChat">;

export function TripChatScreen({ route }: Props) {
  const { theme } = useTheme();
  const [draft, setDraft] = useState("");

  const tripDetailQuery = useTripDetailQuery(route.params.bookingId);
  const chatThreadQuery = useTripChatThreadQuery(route.params.bookingId);
  const sendMutation = useSendTripMessageMutation(route.params.bookingId);

  const disabledReason = useMemo(() => {
    if (!tripDetailQuery.data?.driver) {
      return "Chưa có tài xế nhận chuyến, chưa thể chat được.";
    }

    if (!chatThreadQuery.data?.canChat) {
      return chatThreadQuery.data?.disabledReason ?? "Không thể chat cho chuyến này.";
    }

    return undefined;
  }, [tripDetailQuery.data?.driver, chatThreadQuery.data?.canChat, chatThreadQuery.data?.disabledReason]);

  const disabled = Boolean(disabledReason);

  const onSend = async () => {
    const content = draft.trim();
    if (!content || disabled) {
      return;
    }

    await sendMutation.mutateAsync({
      bookingId: route.params.bookingId,
      content,
      receiverRole: "DRIVER",
    });

    setDraft("");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Chat chuyến đi" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        {chatThreadQuery.isLoading ? <LoadingState message="Đang tải cuộc trò chuyện..." /> : null}
        {chatThreadQuery.isError ? <ErrorState description="Không tải được cuộc trò chuyện" onRetry={chatThreadQuery.refetch} /> : null}

        {!chatThreadQuery.isLoading && !chatThreadQuery.isError && chatThreadQuery.data?.messages?.length === 0 ? (
          <EmptyState title="Chưa có tin nhắn" description="Bắt đầu trò chuyện với tài xế." />
        ) : null}

        <View style={styles.flex}>
          <FlatList
            data={chatThreadQuery.data?.messages ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TripMessageBubble message={item} />}
            contentContainerStyle={styles.messagesContainer}
            inverted={false}
          />
        </View>

        <TripChatComposer
          value={draft}
          onChangeText={setDraft}
          onSend={onSend}
          sending={sendMutation.isPending}
          disabled={disabled}
          disabledReason={disabledReason}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  messagesContainer: {
    padding: 12,
    paddingBottom: 24,
  },
});
