import { z } from 'zod';

const phoneRegex = /^(\+84|84|0)(3|5|7|8|9)\d{8}$/;
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()[\]{}\-_=+\\|;:'",.<>/?`~]).{8,}$/;
const bankCodeRegex = /^[A-Z0-9]{3,12}$/;
const swiftCodeRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export const ownerRegistrationSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên.'),
    phoneNumber: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập số điện thoại.')
      .regex(phoneRegex, 'Số điện thoại không hợp lệ.'),
    email: z.string().trim().min(1, 'Vui lòng nhập email.').email('Email không đúng định dạng.'),
    address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ.'),
    password: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu.')
      .regex(
        strongPasswordRegex,
        'Mật khẩu phải có ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt.',
      ),
    confirmPassword: z.string().min(1, 'Vui lòng nhập xác nhận mật khẩu.'),
    bankName: z.string().trim().min(1, 'Vui lòng nhập tên ngân hàng.'),
    bankAccountNumber: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập số tài khoản.')
      .regex(/^\d{6,20}$/, 'Số tài khoản phải từ 6-20 ký tự.'),
    bankCode: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập mã ngân hàng.')
      .transform((value) => value.toUpperCase())
      .pipe(z.string().regex(bankCodeRegex, 'Mã ngân hàng không hợp lệ (3-12 ký tự).')),
    swiftCode: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập SWIFT code.')
      .transform((value) => value.toUpperCase())
      .pipe(z.string().regex(swiftCodeRegex, 'SWIFT code không hợp lệ.')),
    agreeTerms: z.boolean().refine((value) => value, {
      message: 'Bạn cần đồng ý điều khoản để tiếp tục.',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp.',
    path: ['confirmPassword'],
  });

