import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton, AppTextInput } from '../../components/common';
import type { WalletStackParamList } from '../../types/navigation';
import type { TopupPaymentMethod } from '../../types/wallet';
import { useCreateTopupPaymentMutation } from '../../hooks/useWalletModuleQueries';
import { formatCurrency } from '../../utils/format';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000];
const MIN_TOPUP = 50000;
const MAX_TOPUP = 5000000;

const schema = z.object({
  amount: z
    .string()
    .min(1, 'Nhập số tiền hợp lệ')
    .refine((value) => /^\d+$/.test(value), 'Nhập số tiền hợp lệ')
    .refine((value) => Number(value) >= MIN_TOPUP, `Số tiền tối thiểu là ${MIN_TOPUP.toLocaleString('vi-VN')}`)
    .refine((value) => Number(value) <= MAX_TOPUP, `Số tiền tối đa là ${MAX_TOPUP.toLocaleString('vi-VN')}`),
  paymentMethod: z.enum(['momo', 'sepay', 'zalopay', 'banking'])
});

type FormData = z.infer<typeof schema>;
type Props = NativeStackScreenProps<WalletStackParamList, 'WalletTopUp'>;

const paymentMethods: { id: TopupPaymentMethod; label: string; color: string; activeColor: string; activeTextColor: string }[] = [
  { id: 'momo',    label: 'MoMo',             color: '#FFE4EF', activeColor: '#FFE4EF', activeTextColor: '#B5004A' },
  { id: 'sepay',   label: 'SePay',            color: '#DBEAFE', activeColor: '#DBEAFE', activeTextColor: '#1D4ED8' },
  { id: 'zalopay', label: 'ZaloPay',          color: '#EEF2FF', activeColor: '#EEF2FF', activeTextColor: '#4338CA' },
  { id: 'banking', label: 'Internet Banking', color: '#FEF9C3', activeColor: '#FEF9C3', activeTextColor: '#A16207' },
];

export const WalletTopUpScreen = ({ navigation }: Props) => {
  const createMutation = useCreateTopupPaymentMutation();

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '100000',
      paymentMethod: 'momo'
    }
  });

  const amount = watch('amount');
  const paymentMethod = watch('paymentMethod');

  const onSubmit = handleSubmit(async (values) => {
    const response = await createMutation.mutateAsync({
      amount: Number(values.amount),
      paymentMethod: values.paymentMethod
    });

    navigation.navigate('WalletTopUpPayment', {
      paymentId: response.paymentId,
      amount: response.amount,
      paymentMethod: response.paymentMethod,
      expiresAt: response.expiresAt,
      checkoutUrl: response.checkoutUrl || undefined,
    });
  });

  return (
    <MainLayout title="Nạp tiền vào ví">
      <View style={styles.card}>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <AppTextInput
              label="Số tiền cần nạp"
              keyboardType="number-pad"
              value={field.value ?? ''}
              onChangeText={(value) => field.onChange(value.replace(/[^0-9]/g, ''))}
              error={errors.amount?.message}
              placeholder="Nhập số tiền"
            />
          )}
        />

        <View style={styles.quickWrap}>
          {QUICK_AMOUNTS.map((quick) => (
            <Pressable key={quick} onPress={() => setValue('amount', String(quick))} style={styles.quickChip}>
              <Text style={styles.quickText}>{quick.toLocaleString('vi-VN')}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        <View style={styles.paymentWrap}>
          {paymentMethods.map((item) => {
            const active = paymentMethod === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setValue('paymentMethod', item.id)}
                style={[
                  styles.methodChip,
                  active && { borderColor: item.activeTextColor, backgroundColor: item.activeColor },
                ]}
              >
                <Text
                  style={[
                    styles.methodText,
                    active && { color: item.activeTextColor, fontWeight: '800' },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Tóm tắt giao dịch</Text>
        <Text style={styles.summaryText}>Số tiền: {formatCurrency(Number(amount || 0))}</Text>
        <Text style={styles.summaryText}>Phương thức: {paymentMethod}</Text>
      </View>

      <AppButton title="Tiếp tục thanh toán" onPress={onSubmit} loading={isSubmitting || createMutation.isPending} />
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
    gap: 12
  },
  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quickChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  quickText: {
    color: '#0F766E',
    fontWeight: '700'
  },
  sectionTitle: {
    color: '#0F172A',
    fontWeight: '700'
  },
  paymentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  methodChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  methodText: {
    color: '#334155',
    fontWeight: '600'
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8
  },
  summaryText: {
    color: '#334155'
  }
});
