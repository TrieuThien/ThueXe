import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import type { AccountStackParamList } from '../../types/navigation';
import type { SupportIssueType } from '../../types/support';
import { useCreateSupportTicketMutation } from '../../hooks/useSupportModuleQueries';

const ISSUE_OPTIONS: { id: SupportIssueType; label: string }[] = [
  { id: 'tai_khoan', label: 'Tài khoản' },
  { id: 'chuyen_di', label: 'Chuyến đi' },
  { id: 'vi', label: 'Ví' },
  { id: 'phuong_tien', label: 'Phương tiện' },
  { id: 'ho_so', label: 'Hồ sơ' }
];

type AccountNav = NativeStackNavigationProp<AccountStackParamList>;

export const SupportCreateTicketScreen = () => {
  const navigation = useNavigation<AccountNav>();
  const createMutation = useCreateSupportTicketMutation();

  const [issueType, setIssueType] = useState<SupportIssueType>('tai_khoan');
  const [content, setContent] = useState('');
  const [errorText, setErrorText] = useState('');

  const canSubmit = useMemo(() => content.trim().length >= 10, [content]);

  const onSubmit = () => {
    if (!canSubmit) {
      setErrorText('Nội dung yêu cầu phải có ít nhất 10 ký tự.');
      return;
    }

    setErrorText('');

    createMutation.mutate(
      {
        issueType,
        content: content.trim()
      },
      {
        onSuccess: (data) => {
          navigation.replace('SupportChat', { ticketId: data.ticket.id });
        },
        onError: () => {
          setErrorText('Không tạo được ticket. Vui lòng thử lại.');
        }
      }
    );
  };

  return (
    <MainLayout title="Tạo yêu cầu hỗ trợ">
      <View style={styles.section}>
        <Text style={styles.label}>Loại vấn đề</Text>
        <View style={styles.issueWrap}>
          {ISSUE_OPTIONS.map((item) => {
            const active = issueType === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setIssueType(item.id)}
                style={[styles.issueChip, active && styles.issueChipActive]}
              >
                <Text style={[styles.issueText, active && styles.issueTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Nội dung yêu cầu</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          placeholder="Mô tả vấn đề của bạn, ví dụ mã chuyến, thời gian, thông tin giao dịch..."
          placeholderTextColor="#94A3B8"
          style={styles.contentInput}
        />
        <Text style={styles.helperText}>Bạn có thể tiếp tục chat sau khi tạo ticket.</Text>
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <AppButton title="Gửi yêu cầu" onPress={onSubmit} loading={createMutation.isPending} />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 10
  },
  label: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15
  },
  issueWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  issueChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC'
  },
  issueChipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1D4ED8'
  },
  issueText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '600'
  },
  issueTextActive: {
    color: '#1E40AF',
    fontWeight: '800'
  },
  contentInput: {
    minHeight: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    backgroundColor: '#FFFFFF'
  },
  helperText: {
    color: '#64748B',
    fontSize: 12
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '600'
  }
});
