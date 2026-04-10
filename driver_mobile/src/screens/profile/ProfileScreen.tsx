import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StyleSheet, Text, View } from 'react-native';
import { MainLayout } from '../../layouts/MainLayout';
import { AppButton } from '../../components/common';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { CardInfo, EditableField, StatusBadge } from '../../components/account';
import { useAccountStatusQuery, useProfileQuery, useUpdateProfileMutation } from '../../hooks/useDriverQueries';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/api/authService';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  bankName: z.string().min(2, 'Nhập tên ngân hàng'),
  accountNumber: z.string().regex(/^\d{8,19}$/, 'Số tài khoản 8-19 chữ số'),
  accountHolder: z.string().min(2, 'Nhập tên chủ tài khoản')
});

type ProfileForm = z.infer<typeof profileSchema>;

export const ProfileScreen = () => {
  const clearSession = useAuthStore((state) => state.clearSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const profileQuery = useProfileQuery();
  const statusQuery = useAccountStatusQuery();
  const updateMutation = useUpdateProfileMutation();
  const [formError, setFormError] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ProfileForm>({
    defaultValues: {
      fullName: '',
      email: '',
      bankName: '',
      accountNumber: '',
      accountHolder: ''
    },
    resolver: zodResolver(profileSchema)
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    reset({
      fullName: profileQuery.data.fullName,
      email: profileQuery.data.email || '',
      bankName: profileQuery.data.bank.bankName,
      accountNumber: profileQuery.data.bank.accountNumber,
      accountHolder: profileQuery.data.bank.accountHolder
    });
  }, [profileQuery.data, reset]);

  const handleLogout = async () => {
    await authService.logout();
    clearSession();
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      const updated = await updateMutation.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        bank: {
          bankName: values.bankName,
          accountNumber: values.accountNumber,
          accountHolder: values.accountHolder
        }
      });
      setProfile(updated);
    } catch {
      setFormError('Cập nhật thất bại. Vui lòng thử lại.');
    }
  });

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
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <EditableField
              label="Họ tên"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.fullName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <EditableField
              label="Email"
              value={field.value}
              keyboardType="email-address"
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />

        <EditableField label="Số điện thoại" value={profile.phone} editable={false} keyboardType="phone-pad" />
      </CardInfo>

      <CardInfo title="Thông tin xe hiện tại">
        <EditableField label="Dòng xe" value={profile.vehicle.model} editable={false} />
        <EditableField label="Biển số" value={profile.vehicle.plate} editable={false} />
        <EditableField label="Màu xe" value={profile.vehicle.color} editable={false} />
      </CardInfo>

      <CardInfo title="Thông tin ngân hàng nhận tiền">
        <Controller
          control={control}
          name="bankName"
          render={({ field }) => (
            <EditableField
              label="Ngân hàng"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.bankName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="accountNumber"
          render={({ field }) => (
            <EditableField
              label="Số tài khoản"
              value={field.value}
              keyboardType="number-pad"
              onChangeText={field.onChange}
              error={errors.accountNumber?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="accountHolder"
          render={({ field }) => (
            <EditableField
              label="Chủ tài khoản"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.accountHolder?.message}
            />
          )}
        />
      </CardInfo>

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <AppButton title="Lưu thay đổi" onPress={onSubmit} loading={isSubmitting || updateMutation.isPending} />
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
  },
  formError: {
    color: '#B91C1C',
    textAlign: 'center'
  }
});
