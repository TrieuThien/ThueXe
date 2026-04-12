import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";

import { AuthErrorNotice, AuthLinkRow, AuthScreenLayout, OTPInput, PrimaryButton } from "../../components";
import { getAuthErrorMessage, useResendOtpMutation, useVerifyOtpMutation } from "../../hooks";
import { AuthStackParamList } from "../../navigation";
import { OtpFormValues, otpSchema } from "../../validation/authSchemas";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyOTP">;

export function VerifyOTPScreen({ navigation, route }: Props) {
  const verifyOtpMutation = useVerifyOtpMutation();
  const resendOtpMutation = useResendOtpMutation();

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<OtpFormValues>({
    defaultValues: { otpCode: "" },
    resolver: zodResolver(otpSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await verifyOtpMutation.mutateAsync({
        verificationId: route.params.verificationId,
        otpCode: values.otpCode,
        purpose: route.params.purpose,
      });

      if (response.purpose === "PASSWORD_RESET" && response.resetToken) {
        navigation.replace("ResetPassword", {
          resetToken: response.resetToken,
          identifier: route.params.identifier,
        });
        return;
      }

      navigation.replace("Login");
    } catch (error) {
      setError("root", { message: getAuthErrorMessage(error) });
    }
  });

  const onResendOtp = async () => {
    clearErrors("root");

    try {
      await resendOtpMutation.mutateAsync(route.params.verificationId);
    } catch (error) {
      setError("root", { message: getAuthErrorMessage(error) });
    }
  };

  return (
    <AuthScreenLayout
      title="Xác thực OTP"
      subtitle={`Nhập mã OTP đã gửi đến ${route.params.identifier}. Mã có hiệu lực trong 2 phút.`}
    >
      <Controller
        control={control}
        name="otpCode"
        render={({ field }) => <OTPInput value={field.value} onChange={field.onChange} />}
      />

      <AuthErrorNotice message={errors.root?.message} />

      <PrimaryButton title="Xác nhận OTP" onPress={onSubmit} loading={verifyOtpMutation.isPending} />

      <PrimaryButton
        title="Gửi lại OTP"
        onPress={onResendOtp}
        loading={resendOtpMutation.isPending}
        style={styles.secondaryButton}
      />
      <AuthLinkRow label="Sai thông tin?" actionLabel="Quay lại đăng nhập" onPress={() => navigation.replace("Login")} />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  secondaryButton: {
    marginTop: -6,
  },
  tipText: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.65,
  },
});

