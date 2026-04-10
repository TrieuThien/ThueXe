import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ActiveTrip } from '../../types/trip';

type Props = {
  trip: ActiveTrip;
};

export const CustomerInfoCard = ({ trip }: Props) => {
  const callCustomer = () => {
    void Linking.openURL(`tel:${trip.customerPhone}`);
  };

  const chatCustomer = () => {
    // Placeholder for realtime chat integration.
    console.log('Open chat with customer', trip.customerPhone);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Thông tin khách hàng</Text>
      <Text style={styles.info}>Tên: {trip.customerName}</Text>
      <Text style={styles.info}>SDT: {trip.customerPhone}</Text>
      <View style={styles.actions}>
        <Pressable onPress={chatCustomer} style={styles.actionBtn}>
          <Text style={styles.actionText}>Chat</Text>
        </Pressable>
        <Pressable onPress={callCustomer} style={[styles.actionBtn, styles.callBtn]}>
          <Text style={[styles.actionText, styles.callText]}>Gọi</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A'
  },
  info: {
    color: '#334155'
  },
  actions: {
    flexDirection: 'row',
    gap: 10
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  callBtn: {
    backgroundColor: '#DCFCE7'
  },
  actionText: {
    fontWeight: '700',
    color: '#075985'
  },
  callText: {
    color: '#166534'
  }
});
