import { RentalServiceOption } from "../types";

export const RENTAL_SERVICE_OPTIONS: RentalServiceOption[] = [
  {
    id: "RENTAL_CAR",
    title: "Thuê xe",
    subtitle: "Tự lái theo giờ hoặc ngày",
    iconKey: "car",
  },
  {
    id: "RENTAL_DRIVER",
    title: "Thuê tài xế",
    subtitle: "Tài xế riêng theo giờ",
    iconKey: "driver",
  },
  {
    id: "RENTAL_CAR_WITH_DRIVER",
    title: "Thuê xe kèm tài xế",
    subtitle: "Sắp mở - Đặt lịch sớm hơn",
    iconKey: "combo",
  },
];
