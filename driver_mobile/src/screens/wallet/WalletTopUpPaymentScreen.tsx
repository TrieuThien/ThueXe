import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import type { WalletStackParamList } from '../../types/navigation';
import type { TopupResultStatus } from '../../types/wallet';
import { useTopupPaymentCallbackMutation } from '../../hooks/useWalletModuleQueries';

const toCountdown = (expiresAt: string) => {
  const sec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const mm = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const ss = (sec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

type Props = NativeStackScreenProps<WalletStackParamList, 'WalletTopUpPayment'>;

export const WalletTopUpPaymentScreen = ({ navigation, route }: Props) => {
  const callbackMutation = useTopupPaymentCallbackMutation();
  const [countdown, setCountdown] = useState(toCountdown(route.params.expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(toCountdown(route.params.expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [route.params.expiresAt]);

  const onSimulate = async (status: TopupResultStatus) => {
    const response = await callbackMutation.mutateAsync({
      paymentId: route.params.paymentId,
      status
    });

    navigation.replace('WalletTopUpResult', {
      paymentId: response.paymentId,
      status: response.status,
      amount: response.amount,
      message: response.message
    });
  };

  return (
    <MainLayout title="Thanh toan gia lap">
      <View style={styles.card}>
        <Text style={styles.title}>Cổng thanh toán (Giả lập)</Text>
        <Text style={styles.item}>Mã giao dịch: {route.params.paymentId}</Text>
        <Text style={styles.item}>Số tiền: {route.params.amount.toLocaleString('vi-VN')} VND</Text>
        <Text style={styles.item}>Phương thức: {route.params.paymentMethod}</Text>
        <Text style={styles.countdown}>Hết hạn sau: {countdown}</Text>
      </View>

      <AppButton title="Giả lập thành công" onPress={() => onSimulate('success')} loading={callbackMutation.isPending} />
      <AppButton title="Giả lập thất bại" onPress={() => onSimulate('failed')} loading={callbackMutation.isPending} />

      <Pressable style={styles.timeoutBtn} onPress={() => onSimulate('timeout')}>
        <Text style={styles.timeoutText}>Giả lập timeout</Text>
      </Pressable>
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A'
  },
  item: {
    color: '#334155'
  },
  countdown: {
    color: '#B45309',
    fontWeight: '700'
  },
  timeoutBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  timeoutText: {
    color: '#334155',
    fontWeight: '700'
  }
});
