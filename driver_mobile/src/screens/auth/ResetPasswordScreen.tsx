import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../layouts/AuthLayout';
import { AppButton, AppTextInput, AuthTextLink } from '../../components/common';
import type { AuthStackParamList } from '../../types/navigation';
import type { ServiceError } from '../../types/auth';
import { authService } from '../../services/api/authService';
import { useUiStore } from '../../store/uiStore';

const resetSchema = z
  .object({
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(6, 'Nhập lại mật khẩu')
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp'
  });

type ResetForm = z.infer<typeof resetSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = ({ navigation, route }: Props) => {
  const beginLoading = useUiStore((state) => state.beginLoading);
  const endLoading = useUiStore((state) => state.endLoading);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<ResetForm>({
    defaultValues: { password: '', confirmPassword: '' },
    resolver: zodResolver(resetSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    beginLoading();
    try {
      await authService.resetPassword({
        token: route.params.token,
        newPassword: values.password
      });
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      const serviceError = error as ServiceError;
      setError('password', {
        message: serviceError.message || 'Không đặt lại được mật khẩu. Token có thể đã hết hạn.'
      });
    } finally {
      endLoading();
    }
  });

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle="Tạo mật khẩu mới cho tài khoản tài xế">
      <View style={styles.form}>
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <AppTextInput
              label="Mật khẩu mới"
              placeholder="Nhập mật khẩu mới"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <AppTextInput
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <AppButton title="Cập nhật mật khẩu" onPress={onSubmit} loading={isSubmitting} />
        <AuthTextLink label="Quay lại đăng nhập" onPress={() => navigation.navigate('Login')} />
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  form: { gap: 16 }
});
