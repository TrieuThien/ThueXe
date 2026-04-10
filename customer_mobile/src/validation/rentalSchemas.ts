import { z } from "zod";

export const rentalBookingFormSchema = z.object({
  startAtText: z.string().trim().min(10, "Nhập ngày giờ bắt đầu"),
  durationHours: z
    .string()
    .trim()
    .min(1, "Nhập thời lượng")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 72, "Thời lượng 1-72 giờ"),
  pickupAddress: z.string().trim().min(5, "Điểm đón tối thiểu 5 ký tự"),
  dropoffAddress: z.string().trim().optional(),
  couponCode: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type RentalBookingFormValues = z.infer<typeof rentalBookingFormSchema>;
