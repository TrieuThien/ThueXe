import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';
import { historyService } from '../services/history/historyService';
import type { TripHistoryFilters } from '../types/history';

const PAGE_SIZE = 12;

export const useTripHistoryInfiniteQuery = (filters: TripHistoryFilters) =>
  useInfiniteQuery({
    queryKey: queryKeys.historyList({
      search: filters.search,
      status: filters.status,
      fromDate: filters.fromDate,
      toDate: filters.toDate
    }),
    queryFn: ({ pageParam }) =>
      historyService.getHistoryList({
        page: (pageParam as number) ?? 1,
        pageSize: PAGE_SIZE,
        ...filters
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined)
  });

export const useTripHistoryDetailQuery = (tripId: string) =>
  useQuery({
    queryKey: queryKeys.historyDetail(tripId),
    queryFn: () => historyService.getHistoryDetail(tripId),
    enabled: Boolean(tripId)
  });
