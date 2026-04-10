import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text } from "react-native";

import { AuthErrorNotice, AuthLinkRow, AuthScreenLayout, PrimaryButton, TextField } from "../../components";
import { getAuthErrorMessage, useLoginMutation } from "../../hooks";
import { AuthStackParamList } from "../../navigation";
import { useAuthStore } from "../../store";
import { useTheme } from "../../theme";
import { LoginFormValues, loginSchema } from "../../validation/authSchemas";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const loginMutation = useLoginMutation();
  const setSession = useAuthStore((state) => state.setSession);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      identifier: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await loginMutation.mutateAsync(values);
      setSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user });
    } catch (error) {
      setError("root", { message: getAuthErrorMessage(error) });
    }
  });

  return (
    <AuthScreenLayout title="Đăng nhập" subtitle="Đăng nhập bằng email hoặc số điện thoại để tiếp tục sử dụng dịch vụ.">
      <Controller
        control={control}
        name="identifier"
        render={({ field, fieldState }) => (
          <TextField
            label="Email hoặc số điện thoại"
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            errorMessage={fieldState.error?.message}
            placeholder="example@email.com hoac 0912345678"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Mật khẩu"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
            errorMessage={fieldState.error?.message}
            placeholder="Nhập mật khẩu"
          />
        )}
      />

      <Pressable onPress={() => navigation.navigate("ForgotPassword")}> 
        <Text style={[styles.forgotText, { color: theme.colors.primary }]}>Quên mật khẩu?</Text>
      </Pressable>

      <AuthErrorNotice message={errors.root?.message} />

      <PrimaryButton title="Đăng nhập" onPress={onSubmit} loading={loginMutation.isPending} />

      <AuthLinkRow
        label="Chưa có tài khoản?"
        actionLabel="Đăng ký"
        onPress={() => navigation.navigate("Register")}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  forgotText: {
    fontSize: 14,
    fontWeight: "600",
    alignSelf: "flex-end",
  },
});
