import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../layouts/AuthLayout';
import { AppButton, AppTextInput, AuthTextLink } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/api/authService';
import { useUiStore } from '../../store/uiStore';
import type { AuthStackParamList } from '../../types/navigation';
import type { ServiceError } from '../../types/auth';

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Nhập số điện thoại hoặc email')
    .refine((value) => value.includes('@') || /^0\d{9,10}$/.test(value), 'Email hoặc số điện thoại không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự')
});

type LoginForm = z.infer<typeof loginSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const setSession = useAuthStore((state) => state.setSession);
  const beginLoading = useUiStore((state) => state.beginLoading);
  const endLoading = useUiStore((state) => state.endLoading);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<LoginForm>({
    defaultValues: {
      identifier: '',
      password: ''
    },
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    beginLoading();
    try {
      const result = await authService.login(values);
      setSession(result.profile, result.tokens);
    } catch (error) {
      const serviceError = error as ServiceError;
      if (serviceError.code === 'EMAIL_NOT_FOUND') {
        setError('identifier', { message: 'Email hoặc số điện thoại chưa tồn tại' });
      } else if (serviceError.code === 'INVALID_PASSWORD') {
        setError('password', { message: 'Mật khẩu không chính xác' });
      } else {
        setError('password', { message: serviceError.message || 'Đăng nhập thất bại. Vui lòng thử lại.' });
      }
    } finally {
      endLoading();
    }
  });

  return (
    <AuthLayout title="Đăng nhập tài xế" subtitle="Đăng nhập bằng email hoặc số điện thoại">
      <View style={styles.form}>
        <Controller
          control={control}
          name="identifier"
          render={({ field }) => (
            <AppTextInput
              label="Email hoặc số điện thoại"
              placeholder="vd: driver@thuexe.vn"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.identifier?.message}
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

        <AppButton title="Đăng nhập" onPress={onSubmit} loading={isSubmitting} />

        <View style={styles.links}>
          <AuthTextLink label="Quên mật khẩu" onPress={() => navigation.navigate('ForgotPassword')} />
          <AuthTextLink label="Chưa có tài khoản? Đăng ký" onPress={() => navigation.navigate('Register')} />
        </View>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 16
  },
  links: {
    gap: 10,
    marginTop: 4
  }
});
