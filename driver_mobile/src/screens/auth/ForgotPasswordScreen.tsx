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

const forgotSchema = z.object({
  email: z.string().email('Email không hợp lệ')
});

type ForgotForm = z.infer<typeof forgotSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = ({ navigation }: Props) => {
  const beginLoading = useUiStore((state) => state.beginLoading);
  const endLoading = useUiStore((state) => state.endLoading);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<ForgotForm>({
    defaultValues: {
      email: ''
    },
    resolver: zodResolver(forgotSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    beginLoading();
    try {
      const result = await authService.forgotPassword({ email: values.email });
      navigation.navigate('VerifyOtp', {
        identifier: result.identifier,
        otpRef: result.otpRef,
        purpose: result.purpose
      });
    } catch (error) {
      const serviceError = error as ServiceError;
      if (serviceError.code === 'EMAIL_NOT_FOUND') {
        setError('email', { message: 'Email chưa tồn tại' });
      } else {
        setError('email', { message: serviceError.message });
      }
    } finally {
      endLoading();
    }
  });

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email để nhận OTP đặt lại mật khẩu">
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <AppTextInput
              label="Email"
              placeholder="Nhập email đã đăng ký"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />

        <AppButton title="Gửi mã OTP" onPress={onSubmit} loading={isSubmitting} />

        <AuthTextLink label="Quay lại đăng nhập" onPress={() => navigation.navigate('Login')} />
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 16
  }
});
