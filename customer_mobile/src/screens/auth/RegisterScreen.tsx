import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";

import { AuthErrorNotice, AuthLinkRow, AuthScreenLayout, PrimaryButton, TextField } from "../../components";
import { getAuthErrorMessage, useRegisterMutation } from "../../hooks";
import { AuthStackParamList } from "../../navigation";
import { RegisterFormValues, registerSchema } from "../../validation/authSchemas";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const registerMutation = useRegisterMutation();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await registerMutation.mutateAsync({
        fullName: values.fullName,
        email: values.email || undefined,
        phoneNumber: values.phoneNumber || undefined,
        password: values.password,
      });

      navigation.navigate("VerifyOTP", {
        verificationId: response.verificationId,
        identifier: response.identifier,
        identifierType: response.identifierType,
        purpose: "ACCOUNT_ACTIVATION",
      });
    } catch (error) {
      setError("root", { message: getAuthErrorMessage(error) });
    }
  });

  return (
    <AuthScreenLayout title="Đăng ký" subtitle="Tạo tài khoản mới để gọi xe, thuê xe và thuê tài xế.">
      <Controller
        control={control}
        name="fullName"
        render={({ field, fieldState }) => (
          <TextField
            label="Họ và tên"
            value={field.value}
            onChangeText={field.onChange}
            errorMessage={fieldState.error?.message}
            placeholder="Nguyen Van A"
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            errorMessage={fieldState.error?.message}
            placeholder="you@email.com"
          />
        )}
      />

      <Controller
        control={control}
        name="phoneNumber"
        render={({ field, fieldState }) => (
          <TextField
            label="Số điện thoại"
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="phone-pad"
            errorMessage={fieldState.error?.message}
            placeholder="0912345678"
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
            placeholder="Ít nhất 8 ký tự"
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <TextField
            label="Nhập lại mật khẩu"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
            errorMessage={fieldState.error?.message}
            placeholder="Nhập lại mật khẩu"
          />
        )}
      />

      <AuthErrorNotice message={errors.root?.message} />

      <PrimaryButton title="Đăng ký" onPress={onSubmit} loading={registerMutation.isPending} />

      <AuthLinkRow
        label="Đã có tài khoản?"
        actionLabel="Đăng nhập"
        onPress={() => navigation.navigate("Login")}
      />
    </AuthScreenLayout>
  );
}
