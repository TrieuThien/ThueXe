import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { CardInfo, EditableField, StatusBadge } from '../../components/account';
import { useAccountStatusQuery, useProfileQuery } from '../../hooks/useDriverQueries';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/api/authService';

export const ProfileScreen = () => {
  const clearSession = useAuthStore((state) => state.clearSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const profileQuery = useProfileQuery();
  const statusQuery = useAccountStatusQuery();

  const handleLogout = async () => {
    await authService.logout();
    clearSession();
  };

  if (profileQuery.isLoading || statusQuery.isLoading) {
    return <LoadingState label="Đang tải thông tin tài khoản..." />;
  }

  if (profileQuery.isError || statusQuery.isError) {
    return (
      <ErrorState
        title="Không tải được tài khoản"
        onRetry={() => {
          void profileQuery.refetch();
          void statusQuery.refetch();
        }}
      />
    );
  }

  if (!profileQuery.data || !statusQuery.data) {
    return <EmptyState title="Không có dữ liệu" description="Tài khoản chưa có thông tin để hiển thị." />;
  }

  const profile = profileQuery.data;
  const status = statusQuery.data;
  const needWarning = status.accountStatus !== 'da_kich_hoat' || status.verificationStatus !== 'verified';

  return (
    <MainLayout title="Quản lý tài khoản">
      {needWarning ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>Tài khoản chưa xác thực đầy đủ. Một số tính năng có thể bị giới hạn.</Text>
        </View>
      ) : null}

      <CardInfo title="Trạng thái tài khoản">
        <StatusBadge status={status.accountStatus} />
        <StatusBadge status={status.verificationStatus} />
      </CardInfo>

      <CardInfo title="Thông tin cá nhân">
        <EditableField label="Họ tên" value={profile.fullName ?? ''} editable={false} />

        <EditableField label="Email" value={profile.email ?? ''} editable={false} keyboardType="email-address" />

        <EditableField label="Số điện thoại" value={profile.phone ?? ''} editable={false} keyboardType="phone-pad" />
      </CardInfo>

      <CardInfo title="Thông tin xe hiện tại">
        <EditableField label="Dòng xe" value={profile.vehicle?.model ?? ''} editable={false} />
        <EditableField label="Biển số" value={profile.vehicle?.plate ?? ''} editable={false} />
        <EditableField label="Màu xe" value={profile.vehicle?.color ?? ''} editable={false} />
      </CardInfo>

      <CardInfo title="Thông tin ngân hàng nhận tiền">
        <EditableField label="Ngân hàng" value={profile.bank?.bankName ?? ''} editable={false} />
        <EditableField label="Số tài khoản" value={profile.bank?.accountNumber ?? ''} editable={false} keyboardType="number-pad" />
        <EditableField label="Chủ tài khoản" value={profile.bank?.accountHolder ?? ''} editable={false} />
      </CardInfo>

      <AppButton title="Đăng xuất" onPress={handleLogout} />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  warningBanner: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB'
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600'
  }
});
