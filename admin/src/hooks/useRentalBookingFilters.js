import { useMemo, useState } from "react";

export const DEFAULT_RENTAL_FILTERS = {
    search: "",
    serviceType: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
    limit: 15,
};

export function useRentalBookingFilters(initial = DEFAULT_RENTAL_FILTERS) {
    const [filters, setFilters] = useState(initial);

    const queryParams = useMemo(
        () => ({
            ...filters,
            search: filters.search?.trim() || undefined,
            serviceType: filters.serviceType === "" ? undefined : Number(filters.serviceType),
            status: filters.status === "" ? undefined : filters.status,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
        }),
        [filters]
    );

    function updateFilter(name, value) {
        setFilters((prev) => ({
            ...prev,
            [name]: value,
            page: name === "page" ? value : 1,
        }));
    }

    function resetFilters() {
        setFilters(initial);
    }

    return { filters, queryParams, updateFilter, resetFilters };
}
