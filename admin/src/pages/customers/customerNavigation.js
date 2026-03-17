import { buildRolePath } from "../../config/roleRoutes";

function buildSearchString(values = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        searchParams.set(key, String(value));
    });

    const search = searchParams.toString();
    return search ? `?${search}` : "";
}

export function buildCustomerDetailPath(role, userId) {
    return buildRolePath(role, `customers/${userId}`);
}

export function buildCustomerEditPath(role, userId) {
    return buildRolePath(role, `customers/${userId}/edit`);
}

export function buildBookingCreateDestination(role, customer) {
    return {
        pathname: buildRolePath(role, "booking/create"),
        search: buildSearchString({
            customer_id: customer.user_id,
            customer_name: customer.full_name,
            customer_phone: customer.phone,
            customer_email: customer.email,
            route_id: customer.route_id,
            route_name: customer.route_name,
        }),
    };
}

export function buildBookingCreateState(customer) {
    return {
        prefillCustomer: {
            user_id: customer.user_id,
            full_name: customer.full_name,
            firstname: customer.firstname,
            lastname: customer.lastname,
            phone: customer.phone,
            email: customer.email,
            route_id: customer.route_id,
            route_name: customer.route_name,
            address: customer.address,
        },
    };
}

export function buildBookingHistoryDestination(role, customer) {
    return {
        pathname: buildRolePath(role, "bookings"),
        search: buildSearchString({
            customer_phone: customer.phone,
            customer_id: customer.user_id,
            customer_name: customer.full_name,
        }),
    };
}
