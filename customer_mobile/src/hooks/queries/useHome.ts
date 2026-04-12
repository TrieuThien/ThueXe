import { useQuery } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY } from "../../constants";
import { homeApi } from "../../services";

export function useHome() {
  const overviewQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.home.overview(),
    queryFn: homeApi.getHome,
  });

  const bannersQuery = useQuery({
    queryKey: ["home", "banners"],
    queryFn: homeApi.getBanners,
  });

  const notificationsQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.home.notifications(),
    queryFn: () => homeApi.getNotifications({ page: 1, limit: 20 }),
  });

  const unreadCountQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.home.unreadCount(),
    queryFn: homeApi.getNotificationUnreadCount,
  });

  return {
    overviewQuery,
    bannersQuery,
    notificationsQuery,
    unreadCountQuery,
  };
}
