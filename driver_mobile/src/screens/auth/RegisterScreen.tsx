import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../layouts/AuthLayout';
import { AppButton, AppTextInput, AuthTextLink } from '../../components/common';
import type { AuthStackParamList } from '../../types/navigation';
import { authService } from '../../services/api/authService';
import type { ServiceError } from '../../types/auth';
import { useUiStore } from '../../store/uiStore';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    phone: z.string().regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(6, 'Nhập lại mật khẩu')
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp'
  });

type RegisterForm = z.infer<typeof registerSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const beginLoading = useUiStore((state) => state.beginLoading);
  const endLoading = useUiStore((state) => state.endLoading);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<RegisterForm>({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    },
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    beginLoading();
    try {
      const response = await authService.register({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password
      });

      navigation.navigate('VerifyOtp', {
        identifier: response.identifier,
        otpRef: response.otpRef,
        purpose: response.purpose
      });
    } catch (error) {
      const serviceError = error as ServiceError;
      if (serviceError.code === 'DUPLICATE_ACCOUNT') {
        setError('email', { message: 'Email hoặc số điện thoại đã tồn tại' });
      }
    } finally {
      endLoading();
    }
  });

  return (
    <AuthLayout title="Đăng ký tài khoản" subtitle="ạo tài khoản đối tác tài xế ThueXe">
      <View style={styles.form}>
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <AppTextInput
              label="Họ tên"
              placeholder="Nhập họ và tên"
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
            <AppTextInput
              label="Email"
              placeholder="vd: taixe@ThueXe.vn"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <AppTextInput
              label="Số điện thoại"
              placeholder="Nhập số điện thoại"
              keyboardType="phone-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <AppTextInput
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
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
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <AppButton title="Đăng ký" onPress={onSubmit} loading={isSubmitting} />

        <AuthTextLink label="Đã có tài khoản? Đăng nhập" onPress={() => navigation.navigate('Login')} />
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 14
  }
});
