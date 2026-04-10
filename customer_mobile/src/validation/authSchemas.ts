import { z } from "zod";

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,32}$/;

export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Vui long nhap email hoac so dien thoai")
  .refine(
    (value) => z.email().safeParse(value).success || phoneRegex.test(value),
    "Email hoac so dien thoai khong hop le",
  );

export const passwordSchema = z
  .string()
  .min(8, "Mat khau toi thieu 8 ky tu")
  .max(32, "Mat khau toi da 32 ky tu")
  .regex(passwordRegex, "Mat khau phai gom chu hoa, chu thuong va so");

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Vui long nhap mat khau"),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ho ten toi thieu 2 ky tu").max(80, "Ho ten toi da 80 ky tu"),
    email: z.string().trim().optional(),
    phoneNumber: z.string().trim().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Vui long nhap lai mat khau"),
  })
  .superRefine((values, ctx) => {
    const hasEmail = Boolean(values.email);
    const hasPhone = Boolean(values.phoneNumber);

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Can nhap email hoac so dien thoai",
        path: ["email"],
      });
    }

    if (hasEmail && !z.email().safeParse(values.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email khong hop le",
        path: ["email"],
      });
    }

    if (hasPhone && !phoneRegex.test(values.phoneNumber ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "So dien thoai khong hop le",
        path: ["phoneNumber"],
      });
    }

    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mat khau nhap lai khong khop",
        path: ["confirmPassword"],
      });
    }
  });

export const otpSchema = z.object({
  otpCode: z.string().length(6, "OTP phai gom 6 chu so").regex(/^[0-9]+$/, "OTP chi gom chu so"),
});

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Vui long nhap lai mat khau"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mat khau nhap lai khong khop",
    path: ["confirmNewPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
