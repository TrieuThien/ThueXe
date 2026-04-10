import { HomeOverview } from "../types";
import { HOME_LIMITS } from "../constants";
import { mockDelay } from "./mock/mockDelay";
import { mockHomeOverview } from "./mock/homeData";
import { apiClient } from "./api/client";

const USE_MOCK_HOME = true;

export const homeService = {
  getHomeOverview: async (): Promise<HomeOverview> => {
    if (USE_MOCK_HOME) {
      await mockDelay(500);

      return {
        ...mockHomeOverview,
        recentRoutes: mockHomeOverview.recentRoutes.slice(0, HOME_LIMITS.maxRecentRoutes),
        popularServices: mockHomeOverview.popularServices.slice(0, HOME_LIMITS.maxPopularServices),
        featuredCoupons: mockHomeOverview.featuredCoupons.slice(0, HOME_LIMITS.maxCoupons),
      };
    }

    const response = await apiClient.get<HomeOverview>("/home/overview");
    return response.data;
  },
};
