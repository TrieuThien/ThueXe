import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";

import { AuthErrorNotice, AuthLinkRow, AuthScreenLayout, PrimaryButton, TextField } from "../../components";
import { getAuthErrorMessage, useForgotPasswordMutation } from "../../hooks";
import { AuthStackParamList } from "../../navigation";
import { ForgotPasswordFormValues, forgotPasswordSchema } from "../../validation/authSchemas";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const forgotMutation = useForgotPasswordMutation();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: { identifier: "" },
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await forgotMutation.mutateAsync({ identifier: values.identifier });

      navigation.navigate("VerifyOTP", {
        verificationId: response.verificationId,
        identifier: response.identifier,
        identifierType: response.identifierType,
        purpose: "PASSWORD_RESET",
      });
    } catch (error) {
      setError("root", { message: getAuthErrorMessage(error) });
    }
  });

  return (
    <AuthScreenLayout
      title="Quên mật khẩu"
      subtitle="Nhập email hoặc số điện thoại. Hệ thống sẽ gửi OTP để bạn đặt lại mật khẩu."
    >
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
          />
        )}
      />

      <AuthErrorNotice message={errors.root?.message} />

      <PrimaryButton title="Gửi mã OTP" onPress={onSubmit} loading={forgotMutation.isPending} />

      <AuthLinkRow label="Đã nhớ mật khẩu?" actionLabel="Đăng nhập" onPress={() => navigation.replace("Login")} />
    </AuthScreenLayout>
  );
}
