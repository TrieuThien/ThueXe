import { HomeOverview } from "../../types";

const now = new Date();

export const mockHomeOverview: HomeOverview = {
  currentAddress: "25 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM",
  banners: [
    {
      id: "banner_1",
      title: "Đặt xe siêu tiết kiệm",
      description: "Giảm đến 30% cho chuyến xe nội thành hôm nay",
      imageUrl: "https://scontent.fsgn5-11.fna.fbcdn.net/v/t39.30808-6/536270027_1074021464847646_4006695084183745435_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=13d280&_nc_eui2=AeGmkp0NRRQx6mOJOL9K9x-UiLwsMl058USIvCwyXTnxRK979klBDXhMuON2_AmAbvU-9eD30R-NSTbOHRIavCKa&_nc_ohc=4S9NjmU7mbUQ7kNvwEj3RAh&_nc_oc=Adotjy2Nrxy01IW63a6k-AcV2TBXoQRDc7wDq5eFFcElPXGR9hSGN2w0zAug0TE8VK8&_nc_zt=23&_nc_ht=scontent.fsgn5-11.fna&_nc_gid=czeiUuR_2e08ey2k3d1hpQ&_nc_ss=7a3a8&oh=00_Af33nNxJ6mPDWWNnW_MyPTVre-oeJeDT-z6jUK53x7L4Wg&oe=69D9335C",
      actionType: "BOOKING",
      rideType: "CALL_RIDE",
    },
    {
      id: "banner_2",
      title: "Thuê xe đi chơi lẹ!",
      description: "Ưu đãi xe tự lái cuối tuần, đặt sớm giá tốt",
      imageUrl: "https://thuexedongduong.com/wp-content/uploads/2023/07/thue-xe-4-cho-tphcm-5.jpg",
      actionType: "BOOKING",
      rideType: "RENTAL_CAR",
    },
  ],
  quickDestinations: [
    {
      id: "dest_1",
      label: "Công ty",
      address: "Landmark 81, Bình Thạnh, TP.HCM",
    },
    {
      id: "dest_2",
      label: "Sân bay",
      address: "Ga Quốc Nội, Tân Sơn Nhất, TP.HCM",
    },
    {
      id: "dest_3",
      label: "Nhà",
      address: "Vinhomes Grand Park, Thủ Đức, TP.HCM",
    },
  ],
  recentRoutes: [
    {
      id: "route_1",
      pickupAddress: "Chợ Bến Thành, Quan 1, TP.HCM",
      destinationAddress: "Emart Phan Văn Trị, Gò Vấp, TP.HCM",
      usedAt: now.toISOString(),
      rideType: "CALL_RIDE",
    },
    {
      id: "route_2",
      pickupAddress: "Nguyễn Huệ, Quận 1, TP.HCM",
      destinationAddress: "Crescent Mall, Quận 7, TP.HCM",
      usedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      rideType: "CALL_RIDE",
    },
  ],
  popularServices: [
    {
      id: "popular_1",
      rideType: "CALL_RIDE",
      title: "Xe 4 chỗ",
      description: "Nhận xe nhanh trong 15 - 20 phút.",
      estimatedFromPrice: 28000,
    },
    {
      id: "popular_2",
      rideType: "RENTAL_CAR",
      title: "Thuê xe tự lái",
      description: "Linh hoạt theo ngày hoặc cuối tuần",
      estimatedFromPrice: 650000,
    },
    {
      id: "popular_3",
      rideType: "RENTAL_DRIVER",
      title: "Thuê xe riêng",
      description: "Phù hợp đi công tác hoặc tiếp khách",
      estimatedFromPrice: 180000,
    },
  ],
  featuredCoupons: [
    {
      id: "coupon_1",
      code: "XEMOI30",
      title: "Giảm 30k cho chuyến đầu",
      description: "Áp dụng cho chuyến đi bằng gọi xe",
      discountText: "-30.000d",
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
    {
      id: "coupon_2",
      code: "THUEXE10",
      title: "Giảm 10% thuê xe",
      description: "ối đa 100.000d cho đơn thuê xe",
      discountText: "-10%",
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  ],
};
