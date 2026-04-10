import { RideType } from "../types";

export interface ServiceTypeOption {
  id: RideType;
  title: string;
  subtitle: string;
}

export const SERVICE_TYPE_OPTIONS: ServiceTypeOption[] = [
  {
    id: "CALL_RIDE",
    title: "Gọi xe",
    subtitle: "Đặt xe nhanh trong thành phố",
  },
  {
    id: "RENTAL_CAR",
    title: "Thuê xe",
    subtitle: "Thuê xe theo ngày/chuyến",
  },
  {
    id: "RENTAL_DRIVER",
    title: "Thuê tài xế",
    subtitle: "Đặt tài xế theo giờ",
  },
];
