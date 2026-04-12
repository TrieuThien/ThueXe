import { z } from "zod";

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email hoặc số điện thoại")
  .refine(
    (value) => z.email().safeParse(value).success || phoneRegex.test(value),
    "Email hoặc số điện thoại không hợp lệ",
  );

export const passwordSchema = z
  .string()
  .min(10, "Mật khẩu tối thiểu 10 ký tự")
  .max(128, "Mật khẩu tối đa 128 ký tự")
  .regex(passwordRegex, "Mật khẩu phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt");

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(64, "Tên tối đa 64 ký tự"),
    lastName: z.string().trim().min(2, "Họ tối thiểu 2 ký tự").max(64, "Họ tối đa 64 ký tự"),
    email: z.string().trim().optional(),
    phoneNumber: z.string().trim().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
  })
  .superRefine((values, ctx) => {
    const hasEmail = Boolean(values.email);
    const hasPhone = Boolean(values.phoneNumber);

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập email hoặc số điện thoại",
        path: ["email"],
      });
    }

    if (hasEmail && !z.email().safeParse(values.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email không hợp lệ",
        path: ["email"],
      });
    }

    if (hasPhone && !phoneRegex.test(values.phoneNumber ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Số điện thoại không hợp lệ",
        path: ["phoneNumber"],
      });
    }

    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mật khẩu nhập lại không khớp",
        path: ["confirmPassword"],
      });
    }
  });

export const otpSchema = z.object({
  otpCode: z.string().length(6, "OTP phải gồm 6 chữ số").regex(/^[0-9]+$/, "OTP chỉ gồm chữ số"),
});

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmNewPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
