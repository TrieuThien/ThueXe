import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import type { WalletStackParamList } from '../../types/navigation';
import type { TopupResultStatus } from '../../types/wallet';
import { useTopupPaymentCallbackMutation } from '../../hooks/useWalletModuleQueries';

const GATEWAY_LABELS: Record<string, string> = {
  momo:    'MoMo',
  sepay:   'SePay',
  zalopay: 'ZaloPay',
  banking: 'Internet Banking',
};

const toCountdown = (expiresAt: string) => {
  const sec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const mm = Math.floor(sec / 60).toString().padStart(2, '0');
  const ss = (sec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

type Props = NativeStackScreenProps<WalletStackParamList, 'WalletTopUpPayment'>;

export const WalletTopUpPaymentScreen = ({ navigation, route }: Props) => {
  const callbackMutation = useTopupPaymentCallbackMutation();
  const [countdown, setCountdown] = useState(toCountdown(route.params.expiresAt));
  const { checkoutUrl, paymentMethod, paymentId, amount, expiresAt } = route.params;

  const isRealGateway = Boolean(checkoutUrl);
  const gatewayLabel = GATEWAY_LABELS[paymentMethod] ?? paymentMethod;
  const urlOpenedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(toCountdown(expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  // Tự động mở cổng thanh toán thật lần đầu khi màn hình mount
  useEffect(() => {
    if (isRealGateway && checkoutUrl && !urlOpenedRef.current) {
      urlOpenedRef.current = true;
      Linking.openURL(checkoutUrl).catch(() => {});
    }
  }, [isRealGateway, checkoutUrl]);

  const onOpenGateway = async () => {
    if (checkoutUrl) {
      await Linking.openURL(checkoutUrl);
    }
  };

  const onSimulate = async (status: TopupResultStatus) => {
    const response = await callbackMutation.mutateAsync({ paymentId, status });
    navigation.replace('WalletTopUpResult', {
      paymentId: response.paymentId,
      status: response.status,
      amount: response.amount,
      message: response.message,
    });
  };

  return (
    <MainLayout title="Thanh toán">
      <View style={styles.card}>
        <Text style={styles.title}>
          {isRealGateway ? `Thanh toán qua ${gatewayLabel}` : 'Cổng thanh toán (Giả lập)'}
        </Text>
        <Text style={styles.item}>Mã giao dịch: {paymentId}</Text>
        <Text style={styles.item}>
          Số tiền: {amount.toLocaleString('vi-VN')} VND
        </Text>
        <Text style={styles.item}>Phương thức: {gatewayLabel}</Text>
        <Text style={styles.countdown}>Hết hạn sau: {countdown}</Text>
      </View>

      {isRealGateway ? (
        <>
          <AppButton
            title={`Mở ${gatewayLabel} để thanh toán`}
            onPress={onOpenGateway}
            loading={false}
          />
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Ứng dụng {gatewayLabel} đã được mở. Sau khi thanh toán xong, quay lại đây và nhấn xác nhận kết quả.
            </Text>
          </View>
          <AppButton
            title="Tôi đã thanh toán xong"
            onPress={() => onSimulate('success')}
            loading={callbackMutation.isPending}
          />
          <Pressable style={styles.cancelBtn} onPress={() => onSimulate('failed')}>
            <Text style={styles.cancelText}>Hủy giao dịch</Text>
          </Pressable>
        </>
      ) : (
        <>
          <AppButton
            title="Giả lập thành công"
            onPress={() => onSimulate('success')}
            loading={callbackMutation.isPending}
          />
          <AppButton
            title="Giả lập thất bại"
            onPress={() => onSimulate('failed')}
            loading={callbackMutation.isPending}
          />
          <Pressable style={styles.cancelBtn} onPress={() => onSimulate('timeout')}>
            <Text style={styles.cancelText}>Giả lập timeout</Text>
          </Pressable>
        </>
      )}
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  item: {
    color: '#334155',
  },
  countdown: {
    color: '#B45309',
    fontWeight: '700',
  },
  infoBox: {
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    marginVertical: 4,
  },
  infoText: {
    color: '#1D4ED8',
    fontSize: 13,
    lineHeight: 18,
  },
  cancelBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelText: {
    color: '#334155',
    fontWeight: '700',
  },
});
