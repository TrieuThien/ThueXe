import { z } from "zod";

export const rideLocationSchema = z
  .object({
    pickupAddress: z.string().trim().min(5, "Điểm đón tối thiểu 5 ký tự"),
    destinationAddress: z.string().trim().min(5, "Điểm đến tối thiểu 5 ký tự"),
    stop1: z.string().trim().optional(),
    stop2: z.string().trim().optional(),
    isScheduled: z.boolean(),
    scheduledAtText: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.isScheduled && !values.scheduledAtText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập thời gian hẹn giờ",
        path: ["scheduledAtText"],
      });
      return;
    }

    if (values.isScheduled && values.scheduledAtText) {
      const normalized = values.scheduledAtText.replace(" ", "T");
      const parsed = new Date(normalized);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Định dạng thời gian không hợp lệ",
          path: ["scheduledAtText"],
        });
      }
    }
  });

export type RideLocationFormValues = z.infer<typeof rideLocationSchema>;
