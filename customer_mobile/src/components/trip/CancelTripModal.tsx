import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme";
import { formatCurrencyVND } from "../../utils/format";
import { PrimaryButton } from "../common";

interface CancelTripModalProps {
  visible: boolean;
  reasons: string[];
  selectedReason?: string;
  canCancel: boolean;
  warningText?: string;
  estimatedCancellationFee?: number;
  disabledReason?: string;
  loading?: boolean;
  onSelectReason: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelTripModal({
  visible,
  reasons,
  selectedReason,
  canCancel,
  warningText,
  estimatedCancellationFee,
  disabledReason,
  loading = false,
  onSelectReason,
  onClose,
  onConfirm,
}: CancelTripModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.colors.surface }]} onPress={() => {}}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Hủy chuyến</Text>
          {warningText ? <Text style={[styles.warning, { color: theme.colors.warning }]}>{warningText}</Text> : null}
          {estimatedCancellationFee ? (
            <Text style={[styles.warning, { color: theme.colors.danger }]}>Phí hủy dự kiến: {formatCurrencyVND(estimatedCancellationFee)}</Text>
          ) : null}
          {!canCancel && disabledReason ? <Text style={[styles.warning, { color: theme.colors.danger }]}>{disabledReason}</Text> : null}

          <View style={styles.reasonList}>
            {reasons.map((reason) => {
              const selected = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => onSelectReason(reason)}
                  style={[
                    styles.reasonItem,
                    {
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                >
                  <Text style={[styles.reasonText, { color: theme.colors.text }]}>{reason}</Text>
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton
            title="Xác nhận hủy chuyến"
            onPress={onConfirm}
            loading={loading}
            disabled={!canCancel || !selectedReason}
          />
          <PrimaryButton title="Đóng" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  warning: {
    fontSize: 13,
  },
  reasonList: {
    gap: 8,
    marginTop: 4,
  },
  reasonItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reasonText: {
    fontSize: 13,
  },
});
