import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import type { WalletStackParamList } from '../../types/navigation';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<WalletStackParamList, 'WalletTopUpResult'>;

const RESULT_META = {
  success: {
    title: 'Nạp tiền thành công',
    color: '#166534',
    bg: '#DCFCE7'
  },
  failed: {
    title: 'Nạp tiền thất bại',
    color: '#991B1B',
    bg: '#FEE2E2'
  },
  timeout: {
    title: 'Giao dịch hết hạn',
    color: '#92400E',
    bg: '#FEF3C7'
  }
} as const;

export const WalletTopUpResultScreen = ({ navigation, route }: Props) => {
  const meta = RESULT_META[route.params.status];

  return (
    <MainLayout title="Kết quả giao dịch">
      <View style={[styles.card, { backgroundColor: meta.bg }]}>
        <Text style={[styles.title, { color: meta.color }]}>{meta.title}</Text>
        <Text style={styles.item}>Mã giao dịch: {route.params.paymentId}</Text>
        <Text style={styles.item}>Số tiền: {formatCurrency(route.params.amount)}</Text>
        <Text style={styles.item}>{route.params.message}</Text>
      </View>

      <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('WalletIncome')}>
        <Text style={styles.primaryText}>Xem ví và thu nhập</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('WalletTopUp')}>
        <Text style={styles.secondaryText}>Nạp tiền tiếp</Text>
      </Pressable>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 8
  },
  title: {
    fontSize: 22,
    fontWeight: '800'
  },
  item: {
    color: '#334155'
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  secondaryText: {
    color: '#334155',
    fontWeight: '700'
  }
});
