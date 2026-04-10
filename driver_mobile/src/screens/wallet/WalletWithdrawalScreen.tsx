import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import {
  useCreateWithdrawalMutation,
  usePayoutAccountQuery,
  useWalletSummaryQuery,
  useWithdrawalHistoryQuery
} from '../../hooks/useWalletModuleQueries';
import type { WalletStackParamList } from '../../types/navigation';
import { formatCurrency, formatDateTime } from '../../utils/format';

const schema = z.object({
  amount: z
    .string()
    .min(1, 'Nhập số tiền cần rút')
    .refine((value) => /^\d+$/.test(value), 'Số tiền không hợp lệ')
    .refine((value) => Number(value) >= 50000, 'Số tiền rút tối thiểu là 50,000 VND')
});

type FormData = z.infer<typeof schema>;

const statusMeta: Record<'pending' | 'paid' | 'failed' | 'cancelled', { label: string; color: string }> = {
  pending: { label: 'Dang xu ly', color: '#B45309' },
  paid: { label: 'Da chi tra', color: '#15803D' },
  failed: { label: 'That bai', color: '#B91C1C' },
  cancelled: { label: 'Da huy', color: '#334155' }
};

export const WalletWithdrawalScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WalletStackParamList>>();
  const summaryQuery = useWalletSummaryQuery();
  const payoutQuery = usePayoutAccountQuery();
  const historyQuery = useWithdrawalHistoryQuery();
  const createMutation = useCreateWithdrawalMutation();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uiError, setUiError] = useState('');

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: ''
    }
  });

  const amount = watch('amount');
  const amountNumber = Number(amount || 0);

  const isLoading = summaryQuery.isLoading || payoutQuery.isLoading || historyQuery.isLoading;
  const isError = summaryQuery.isError || payoutQuery.isError || historyQuery.isError;

  const notEnoughBalance = useMemo(() => {
    if (!summaryQuery.data) {
      return false;
    }
    return amountNumber > summaryQuery.data.currentBalance;
  }, [amountNumber, summaryQuery.data]);

  if (isLoading) {
    return <LoadingState label="Đang tải thông tin rút tiền..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Không tải được thông tin rút tiền"
        onRetry={() => {
          void summaryQuery.refetch();
          void payoutQuery.refetch();
          void historyQuery.refetch();
        }}
      />
    );
  }

  if (!summaryQuery.data) {
    return <EmptyState title="Không có dữ liệu" description="Không tải được số dư khả dụng." />;
  }

  const payout = payoutQuery.data;
  const historyItems = Array.isArray(historyQuery.data?.items) ? historyQuery.data.items : [];

  const onOpenConfirm = handleSubmit(() => {
    setUiError('');
    if (notEnoughBalance) {
      setUiError('Số dư không đủ để rút số tiền này.');
      return;
    }
    if (!payout) {
      setUiError('Bạn chưa có thông tin nhận tiền.');
      return;
    }
    setShowConfirmModal(true);
  });

  const onConfirm = async () => {
    setUiError('');
    try {
      await createMutation.mutateAsync({ amount: amountNumber });
      setShowConfirmModal(false);
      setValue('amount', '');
      await Promise.all([summaryQuery.refetch(), historyQuery.refetch()]);
    } catch {
      setUiError('Gửi yêu cầu rút tiền thất bại. Vui lòng thử lại.');
      setShowConfirmModal(false);
    }
  };

  return (
    <MainLayout title="Yêu cầu rút tiền">
      <View style={styles.card}>
        <Text style={styles.title}>Số dư khả dụng</Text>
        <Text style={styles.balance}>{formatCurrency(summaryQuery.data.currentBalance)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Thông tin ngân hàng nhận tiền</Text>
        {payout ? (
          <>
            <Text style={styles.item}>Ngân hàng: {payout.bankName}</Text>
            <Text style={styles.item}>Số tài khoản: {payout.accountNumber}</Text>
            <Text style={styles.item}>Chủ tài khoản: {payout.accountHolder}</Text>
          </>
        ) : (
          <>
            <Text style={styles.warn}>Bạn chưa có thông tin ngân hàng.</Text>
            <Pressable
              onPress={() => {
                navigation.getParent()?.navigate('AccountTab', { screen: 'Profile' });
              }}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Bổ sung tài khoản ngân hàng</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Nhập số tiền cần rút</Text>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={(value) => field.onChange(value.replace(/[^0-9]/g, ''))}
              placeholder="Nhập số tiền"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              style={styles.input}
            />
          )}
        />
        {errors.amount?.message ? <Text style={styles.errorText}>{errors.amount.message}</Text> : null}
        {notEnoughBalance ? <Text style={styles.warn}>Số dư hiện tại không đủ.</Text> : null}
        {uiError ? <Text style={styles.errorText}>{uiError}</Text> : null}
        <AppButton title="Gửi yêu cầu rút tiền" onPress={onOpenConfirm} loading={isSubmitting || createMutation.isPending} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Lịch sử yêu cầu rút tiền</Text>
        {historyItems.length ? (
          historyItems.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyTop}>
                <Text style={styles.item}>{formatCurrency(item.amount)}</Text>
                <Text style={[styles.status, { color: statusMeta[item.status].color }]}>{statusMeta[item.status].label}</Text>
              </View>
              <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
              {item.note ? <Text style={styles.meta}>{item.note}</Text> : null}
            </View>
          ))
        ) : (
          <EmptyState title="Chưa có yêu cầu" description="Bạn chưa tạo yêu cầu rút tiền nào." />
        )}
      </View>

      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Xác nhận rút tiền</Text>
            <Text style={styles.item}>Số tiền: {formatCurrency(amountNumber)}</Text>
            <Text style={styles.item}>Ngân hàng: {payout?.bankName || '-'}</Text>
            <Text style={styles.item}>Chủ tài khoản: {payout?.accountHolder || '-'}</Text>
            <AppButton title="Xác nhận gửi" onPress={onConfirm} loading={createMutation.isPending} />
            <Pressable onPress={() => setShowConfirmModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8
  },
  title: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 16
  },
  balance: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 28
  },
  item: {
    color: '#334155'
  },
  warn: {
    color: '#B45309',
    fontWeight: '600'
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '600'
  },
  linkBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  linkText: {
    color: '#0F766E',
    fontWeight: '700'
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    color: '#0F172A'
  },
  historyItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 4
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  status: {
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12
  },
  meta: {
    color: '#64748B',
    fontSize: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10
  },
  modalTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 18
  },
  cancelBtn: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelText: {
    color: '#334155',
    fontWeight: '700'
  }
});
