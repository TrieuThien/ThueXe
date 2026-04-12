import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "../../constants";
import { homeService } from "../../services/homeService";

export function useHomeOverviewQuery(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.homeOverview,
    queryFn: homeService.getHomeOverview,
    enabled,
  });
}
