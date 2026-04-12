import axios from "axios";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const CUSTOMER_PREFIX = "/api/customer";
const IDENTIFIER = process.env.E2E_IDENTIFIER ?? "demo@thuexe.vn";
const PASSWORD = process.env.E2E_PASSWORD ?? "Pass@123456";

function logStep(name, payload) {
  console.log(`\n[STEP] ${name}`);
  if (payload !== undefined) {
    console.log(JSON.stringify(payload, null, 2));
  }
}

function getUiPaymentStatus(paymentDetail) {
  if (!paymentDetail || typeof paymentDetail !== "object") {
    return "unknown";
  }

  // UI must use payment status from payments data, not pgateway status fields.
  const status = paymentDetail.payment_status ?? paymentDetail.status ?? "unknown";
  return String(status).toLowerCase();
}

async function safeCall(name, requestFn) {
  try {
    const response = await requestFn();
    logStep(name, response.data?.data ?? response.data);
    return response.data?.data ?? response.data;
  } catch (error) {
    logStep(`${name} (failed)`, {
      message: error?.response?.data?.message ?? error.message,
      code: error?.response?.data?.code ?? error?.response?.data?.error?.code,
      status: error?.response?.status ?? 0,
    });
    return null;
  }
}

async function main() {
  const publicClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: { "Content-Type": "application/json" },
  });

  await safeCall("register", () =>
    publicClient.post(`${CUSTOMER_PREFIX}/auth/register`, {
      firstname: "E2E",
      lastname: "Customer",
      email: IDENTIFIER.includes("@") ? IDENTIFIER : undefined,
      phone: IDENTIFIER.includes("@") ? undefined : IDENTIFIER,
      password: PASSWORD,
    }),
  );

  const loginData = await safeCall("login", () =>
    publicClient.post(`${CUSTOMER_PREFIX}/auth/login`, {
      identifier: IDENTIFIER,
      password: PASSWORD,
    }),
  );

  if (!loginData?.accessToken) {
    throw new Error("Cannot continue e2e flow: missing accessToken from login.");
  }

  const authClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${loginData.accessToken}`,
    },
  });

  await safeCall("home", () => authClient.get(`${CUSTOMER_PREFIX}/home`));
  await safeCall("wallet", () => authClient.get(`${CUSTOMER_PREFIX}/wallet`));
  await safeCall("notifications", () => authClient.get(`${CUSTOMER_PREFIX}/notifications`));

  const routeEstimate = await safeCall("ride.estimate-route", () =>
    authClient.post(`${CUSTOMER_PREFIX}/ride/map/estimate-route`, {
      pickup: { lat: 10.776, lng: 106.701 },
      dropoff: { lat: 10.782, lng: 106.705 },
      waypoints: [],
    }),
  );

  const fareEstimate = await safeCall("ride.fare-estimate", () =>
    authClient.post(`${CUSTOMER_PREFIX}/ride/fare-estimate`, {
      route_id: routeEstimate?.route_id ?? 1,
      ride_id: 1,
      payment_type: 3,
      map_estimate: {
        distance_km: routeEstimate?.distance_km ?? 5,
        duration_min: routeEstimate?.duration_min ?? 15,
      },
    }),
  );

  const booking = await safeCall("ride.create-booking", () =>
    authClient.post(`${CUSTOMER_PREFIX}/ride/bookings`, {
      route_id: routeEstimate?.route_id ?? 1,
      ride_id: 1,
      service_type: 0,
      payment_type: 3,
      num_seats: 1,
      pickup_address: "123 Example Pickup",
      dropoff_address: "456 Example Dropoff",
      pickup: { lat: 10.776, lng: 106.701 },
      dropoff: { lat: 10.782, lng: 106.705 },
      map_estimate: {
        distance_km: routeEstimate?.distance_km ?? fareEstimate?.distance_km ?? 5,
        duration_min: routeEstimate?.duration_min ?? fareEstimate?.duration_min ?? 15,
      },
    }),
  );

  if (booking?.booking?.id) {
    await safeCall("ride.booking-detail", () => authClient.get(`${CUSTOMER_PREFIX}/ride/bookings/${booking.booking.id}`));
    await safeCall("ride.chat.send", () =>
      authClient.post(`${CUSTOMER_PREFIX}/chats/booking/${booking.booking.id}`, {
        message: "E2E test message",
        message_type: "text",
      }),
    );
    await safeCall("ride.pay", () =>
      authClient.post(`${CUSTOMER_PREFIX}/payments/ride/${booking.booking.id}/pay`, {
        payment_type: 3,
      }),
    );
    await safeCall("ride.cancel", () =>
      authClient.post(`${CUSTOMER_PREFIX}/ride/bookings/${booking.booking.id}/cancel`, {
        reason: "E2E cleanup",
      }),
    );
  }

  const rental = await safeCall("rental.create-booking", () =>
    authClient.post(`${CUSTOMER_PREFIX}/rentals/bookings`, {
      package_id: 1,
      service_type: 1,
      start_datetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      duration_hours: 4,
      distance_km: 25,
      pickup_address: "123 Example Pickup",
      dropoff_address: "456 Example Dropoff",
      payment_type: 3,
    }),
  );

  if (rental?.rental_booking?.id) {
    await safeCall("rental.pay", () =>
      authClient.post(`${CUSTOMER_PREFIX}/payments/rental/${rental.rental_booking.id}/pay`, {
        payment_type: 3,
      }),
    );
    await safeCall("rental.chat.send", () =>
      authClient.post(`${CUSTOMER_PREFIX}/rental-chats/${rental.rental_booking.id}`, {
        message: "E2E rental chat",
        message_type: "text",
      }),
    );
  }

  const topup = await safeCall("wallet.topup.create", () =>
    authClient.post(`${CUSTOMER_PREFIX}/wallet/topup/create-payment`, {
      amount: 10000,
      gateway_name: "momo",
    }),
  );

  if (topup?.payment?.id) {
    await safeCall("wallet.payment-detail", () => authClient.get(`${CUSTOMER_PREFIX}/payments/${topup.payment.id}`));
    const paymentDetail = await safeCall("wallet.payment-detail.recheck", () =>
      authClient.get(`${CUSTOMER_PREFIX}/payments/${topup.payment.id}`),
    );
    logStep("ui.payment-status", {
      statusForUi: getUiPaymentStatus(paymentDetail?.payment ?? paymentDetail),
      ignoredGatewayStatus: paymentDetail?.payment?.gateway_status ?? paymentDetail?.gateway_status ?? null,
    });
  }

  await safeCall("wallet.withdraw", () =>
    authClient.post(`${CUSTOMER_PREFIX}/wallet/withdrawals`, {
      amount: 10000,
      bank_account_id: 1,
      note: "E2E withdraw",
    }),
  );

  await safeCall("logout", () => authClient.post(`${CUSTOMER_PREFIX}/auth/logout`, {}));
}

main().catch((error) => {
  console.error("\n[E2E FAILED]", error.message);
  process.exitCode = 1;
});
