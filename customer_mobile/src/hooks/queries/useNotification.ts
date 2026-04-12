import { useQuery } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY } from "../../constants";
import { homeApi } from "../../services";

export function useNotification(page = 1, limit = 20) {
  const notificationsQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.home.notifications(page, limit),
    queryFn: () => homeApi.getNotifications({ page, limit }),
  });

  const unreadCountQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.home.unreadCount(),
    queryFn: homeApi.getNotificationUnreadCount,
  });

  return {
    notificationsQuery,
    unreadCountQuery,
  };
}
