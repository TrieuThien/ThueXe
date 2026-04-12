import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StyleSheet, Text, View } from 'react-native';
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
  const [successMessage, setSuccessMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<ForgotForm>({
    defaultValues: { email: '' },
    resolver: zodResolver(forgotSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    beginLoading();
    setSuccessMessage('');
    try {
      const result = await authService.forgotPassword({ email: values.email });
      // Backend gửi link reset qua email, không có OTP flow trên mobile
      setSuccessMessage(result.message || 'Vui lòng kiểm tra email để đặt lại mật khẩu.');
    } catch (error) {
      const serviceError = error as ServiceError;
      setError('email', { message: serviceError.message || 'Không gửi được yêu cầu. Vui lòng thử lại.' });
    } finally {
      endLoading();
    }
  });

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email để nhận link đặt lại mật khẩu">
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

        {successMessage ? (
          <Text style={styles.successMessage}>{successMessage}</Text>
        ) : null}

        <AppButton title="Gửi yêu cầu" onPress={onSubmit} loading={isSubmitting} />

        <AuthTextLink label="Quay lại đăng nhập" onPress={() => navigation.navigate('Login')} />
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 16
  },
  successMessage: {
    color: '#059669',
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 8
  }
});
