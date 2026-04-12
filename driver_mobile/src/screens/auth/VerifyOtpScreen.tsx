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
import { useOtpCountdown } from '../../hooks/useOtpCountdown';
import { AUTH_OTP_SECONDS } from '../../constants/auth';
import { useUiStore } from '../../store/uiStore';

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP gồm 6 chữ số')
});

type OtpForm = z.infer<typeof otpSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

export const VerifyOtpScreen = ({ navigation, route }: Props) => {
  const [serverError, setServerError] = useState('');
  const { secondsLeft, formatted, reset } = useOtpCountdown(AUTH_OTP_SECONDS);
  const beginLoading = useUiStore((state) => state.beginLoading);
  const endLoading = useUiStore((state) => state.endLoading);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset: resetForm
  } = useForm<OtpForm>({
    defaultValues: { otp: '' },
    resolver: zodResolver(otpSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    beginLoading();
    setServerError('');

    try {
      await authService.verifyOtp({
        driver_id: route.params.driver_id,
        code: values.otp
      });

      // Sau OTP thành công → về màn hình Login (account đã được kích hoạt)
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      const serviceError = error as ServiceError;
      if (serviceError.code === 'OTP_INVALID') {
        setError('otp', { message: 'OTP không đúng. Vui lòng kiểm tra lại.' });
      } else if (serviceError.code === 'OTP_EXPIRED') {
        setError('otp', { message: 'OTP đã hết hạn. Hãy gửi lại mã mới.' });
      } else {
        setServerError(serviceError.message || 'Xác thực thất bại. Vui lòng thử lại.');
      }
    } finally {
      endLoading();
    }
  });

  const handleResendOtp = async () => {
    beginLoading();
    setServerError('');
    try {
      await authService.resendOtp(route.params.identifier);
      // Backend không trả otpRef mới; reset đếm ngược về mặc định
      reset(AUTH_OTP_SECONDS);
      resetForm({ otp: '' });
    } catch (error) {
      const serviceError = error as ServiceError;
      setServerError(serviceError.message || 'Không gửi lại được OTP. Vui lòng thử lại.');
    } finally {
      endLoading();
    }
  };

  return (
    <AuthLayout title="Xác thực OTP" subtitle={`Nhập mã OTP đã gửi đến ${route.params.identifier}`}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="otp"
          render={({ field }) => (
            <AppTextInput
              label="Mã OTP"
              placeholder="Nhập 6 chữ số"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.otp?.message}
            />
          )}
        />

        {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

        <AppButton title="Xác nhận OTP" onPress={onSubmit} loading={isSubmitting} />

        {secondsLeft > 0 ? (
          <Text style={styles.countdown}>Gửi lại OTP sau {formatted}</Text>
        ) : (
          <AuthTextLink label="Gửi lại OTP" onPress={handleResendOtp} />
        )}
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 16
  },
  countdown: {
    color: '#64748B',
    textAlign: 'center'
  },
  serverError: {
    color: '#B91C1C',
    textAlign: 'center'
  }
});
