import { useMemo, useState } from "react";

export const DEFAULT_BOOKING_FILTERS = {
    search: "",
    booking_type: "",
    booking_code: "",
    customer_name: "",
    customer_phone: "",
    driver_keyword: "",
    status: "",
    booking_date: "",
    payment_type: "",
    page: 1,
    limit: 15,
};

export function useBookingFilters(initial = DEFAULT_BOOKING_FILTERS) {
    const [filters, setFilters] = useState(initial);

    const queryParams = useMemo(
        () => ({
            ...filters,
            search: filters.search?.trim() || undefined,
            status: filters.status === "" ? undefined : Number(filters.status),
            booking_type: filters.booking_type === "" ? undefined : Number(filters.booking_type),
            payment_type: filters.payment_type === "" ? undefined : Number(filters.payment_type),
            booking_code: filters.booking_code?.trim() || undefined,
            customer_name: filters.customer_name?.trim() || undefined,
            customer_phone: filters.customer_phone?.trim() || undefined,
            driver_keyword: filters.driver_keyword?.trim() || undefined,
            booking_date: filters.booking_date || undefined,
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

    return {
        filters,
        queryParams,
        updateFilter,
        resetFilters,
        setFilters,
    };
}
