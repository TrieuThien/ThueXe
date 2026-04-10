import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";

import { AuthErrorNotice, AuthLinkRow, AuthScreenLayout, PrimaryButton, TextField } from "../../components";
import { getAuthErrorMessage, useResetPasswordMutation } from "../../hooks";
import { AuthStackParamList } from "../../navigation";
import { ResetPasswordFormValues, resetPasswordSchema } from "../../validation/authSchemas";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const resetMutation = useResetPasswordMutation();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetMutation.mutateAsync({
        resetToken: route.params.resetToken,
        newPassword: values.newPassword,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      setError("root", { message: getAuthErrorMessage(error) });
    }
  });

  return (
    <AuthScreenLayout
      title="Đặt lại mật khẩu"
      subtitle={`Cập nhật mật khẩu mới cho tài khoản ${route.params.identifier}.`}
    >
      <Controller
        control={control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <TextField
            label="Mật khẩu mới"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
            errorMessage={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmNewPassword"
        render={({ field, fieldState }) => (
          <TextField
            label="Nhập lại mật khẩu mới"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
            errorMessage={fieldState.error?.message}
          />
        )}
      />

      <AuthErrorNotice message={errors.root?.message} />

      <PrimaryButton title="Xác nhận mật khẩu mới" onPress={onSubmit} loading={resetMutation.isPending} />

      <AuthLinkRow label="Trở lại" actionLabel="Đăng nhập" onPress={() => navigation.replace("Login")} />
    </AuthScreenLayout>
  );
}
