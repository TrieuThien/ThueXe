import { RideType } from "./ride";
import { ID } from "./common";

export interface HomeBanner {
  id: ID;
  title: string;
  description: string;
  imageUrl: string;
  actionType: "BOOKING" | "OPEN_PROMOTION";
  rideType?: RideType;
}

export interface QuickDestination {
  id: ID;
  label: string;
  address: string;
}

export interface RecentRoute {
  id: ID;
  pickupAddress: string;
  destinationAddress: string;
  usedAt: string;
  rideType: RideType;
}

export interface PopularService {
  id: string;
  rideType: RideType;
  title: string;
  description: string;
  estimatedFromPrice: number;
}

export interface FeaturedCoupon {
  id: ID;
  code: string;
  title: string;
  description: string;
  discountText: string;
  expiresAt: string;
}

export interface HomeOverview {
  currentAddress: string;
  banners: HomeBanner[];
  quickDestinations: QuickDestination[];
  recentRoutes: RecentRoute[];
  popularServices: PopularService[];
  featuredCoupons: FeaturedCoupon[];
}
