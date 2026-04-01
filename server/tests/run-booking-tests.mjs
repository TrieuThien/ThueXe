import assert from "node:assert/strict";
import AppError from "../utils/appError.js";
import { createBookingService, BOOKING_STATUS } from "../services/bookingService.js";
import { passengerBookingCreateLimiter } from "../middlewares/rateLimiters.js";

function logPass(name) {
    console.log(`PASS: ${name}`);
}

function logFail(name, error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
}

function buildCreateBookingServiceHarness({ activeBooking = null } = {}) {
    let bookingIdSequence = 200;
    let insertCalls = 0;
    const bookings = new Map();

    const service = createBookingService({
        runInTransaction: async (work) => work({}),
        findBookingByUuidForUser: async ({ userId, bookingUuid }) => {
            for (const item of bookings.values()) {
                if (item.user_id === userId && item.b_uuid === bookingUuid) {
                    return item.id;
                }
            }
            return null;
        },
        findPassengerById: async () => ({
            user_id: 11,
            firstname: "Lan",
            lastname: "Nguyen",
            phone: "+84900000001",
            account_active: 1,
            is_activated: 1,
            account_deleted: 0,
        }),
        findRouteById: async () => ({ id: 1, r_title: "HCM" }),
        findRideById: async () => ({ id: 2, ride_type: "Sedan", avail: 1 }),
        findUserActiveBookingForUpdate: async () => activeBooking,
        insertBooking: async (payload) => {
            insertCalls += 1;
            const nextId = bookingIdSequence++;
            bookings.set(nextId, {
                id: nextId,
                b_uuid: payload.bookingUuid,
                user_id: payload.user_id,
                status: payload.status,
                payment_type: payload.payment_type,
                pickup_address: payload.pickup_address,
                dropoff_address: payload.dropoff_address,
                route_id: payload.route_id,
                ride_id: payload.ride_id,
                scheduled: payload.scheduled,
                driver_id: 0,
                estimated_cost: payload.estimated_cost,
                actual_cost: payload.actual_cost,
                paid_amount: 0,
                haspaid: 0,
                date_created: "2026-03-19 10:00:00",
            });
            return nextId;
        },
        insertNotification: async () => {},
        findBookingDetailById: async (bookingId) => {
            const booking = bookings.get(Number(bookingId));
            if (!booking) {
                return {
                    booking: {
                        id: Number(bookingId),
                        b_uuid: `stub-${bookingId}`,
                        user_id: 11,
                        status: BOOKING_STATUS.PENDING,
                        payment_type: 1,
                        pickup_address: "pickup",
                        dropoff_address: "dropoff",
                        route_id: 1,
                        ride_id: 2,
                        scheduled: 0,
                        driver_id: 0,
                    },
                    user: { id: 11 },
                    driver: null,
                };
            }
            return {
                booking,
                user: { id: booking.user_id },
                driver: null,
            };
        },
        listBookings: async () => [],
        countBookings: async () => 0,
        findBookingAllocations: async () => [],
        findLatestDriverLocation: async () => null,
        findBookingByIdForUpdate: async (bookingId) => ({
            id: Number(bookingId),
            user_id: 11,
            driver_id: 0,
            scheduled: 0,
            scheduled_driver: 0,
            status: BOOKING_STATUS.PENDING,
            payment_type: 1,
        }),
        findDriverById: async (driverId) => ({
            driver_id: Number(driverId),
            firstname: "Driver",
            lastname: "One",
            phone: "+84900000111",
            franchise_id: 1,
            account_active: 1,
            is_activated: 1,
            account_deleted: 0,
            available: 1,
            operation_status: 0,
            route_id: 1,
            ride_id: 2,
        }),
        finalizeNonAcceptedAllocations: async () => {},
        updateBookingDriverAssignment: async () => {},
        createDriverAllocation: async () => 1,
        updateBookingStatus: async () => {},
        listAssignableDrivers: async () => [],
    });

    return {
        service,
        getInsertCalls: () => insertCalls,
    };
}

function runLimiter(req) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                resolve({ blocked: true, statusCode: this.statusCode, payload });
                return this;
            },
            send(payload) {
                resolve({ blocked: true, statusCode: this.statusCode, payload });
                return this;
            },
            setHeader() {
                return this;
            },
        };

        passengerBookingCreateLimiter(req, res, () => {
            resolve({ blocked: false, statusCode: 200 });
        });
    });
}

async function testCreateBookingSuccess() {
    const { service, getInsertCalls } = buildCreateBookingServiceHarness();

    const result = await service.createBooking({
        payload: {
            route_id: 1,
            ride_id: 2,
            pickup_address: "1 Nguyen Hue",
            dropoff_address: "2 Le Loi",
            estimated_cost: 120000,
            payment_type: 1,
        },
        auth: { userId: 11, role: "passenger", userType: 0 },
        idempotencyKey: "create-booking-1",
        ipAddress: "127.0.0.1",
    });

    assert.equal(result.booking.status, 0);
    assert.equal(result.idempotent_replay, false);
    assert.equal(getInsertCalls(), 1);
}

async function testConcurrentCreate() {
    const { service, getInsertCalls } = buildCreateBookingServiceHarness();

    const requestPayload = {
        payload: {
            route_id: 1,
            ride_id: 2,
            pickup_address: "1 Nguyen Hue",
            dropoff_address: "2 Le Loi",
            estimated_cost: 130000,
            payment_type: 1,
        },
        auth: { userId: 11, role: "passenger", userType: 0 },
        idempotencyKey: "create-booking-concurrent",
        ipAddress: "127.0.0.1",
    };

    const [first, second] = await Promise.all([
        service.createBooking(requestPayload),
        service.createBooking(requestPayload),
    ]);

    assert.equal(getInsertCalls(), 1);
    assert.equal(first.booking.id, second.booking.id);
}

async function testAssignDriverRbac() {
    const { service } = buildCreateBookingServiceHarness();

    let error = null;
    try {
        await service.assignDriver({
            bookingId: 999,
            driverId: 22,
            auth: { userId: 11, role: "passenger", userType: 0 },
        });
    } catch (caughtError) {
        error = caughtError;
    }

    assert.ok(error instanceof AppError);
    assert.equal(error.code, "FORBIDDEN");
}

async function testAssignDriverSuccess() {
    const { service } = buildCreateBookingServiceHarness();

    const result = await service.assignDriver({
        bookingId: 999,
        driverId: 22,
        auth: { userId: 1, role: "dispatcher", userType: 0 },
    });

    assert.equal(result.booking.id, 999);
}

async function testInvalidStatusTransition() {
    const service = createBookingService({
        runInTransaction: async (work) => work({}),
        findBookingByIdForUpdate: async () => ({
            id: 88,
            user_id: 11,
            driver_id: 1,
            scheduled: 0,
            scheduled_driver: 0,
            status: BOOKING_STATUS.PENDING,
            payment_type: 1,
        }),
        updateBookingStatus: async () => {},
        finalizeNonAcceptedAllocations: async () => {},
        findBookingDetailById: async () => ({
            booking: {
                id: 88,
                user_id: 11,
                status: BOOKING_STATUS.PENDING,
                payment_type: 1,
            },
            user: { id: 11 },
            driver: { id: 1 },
        }),
    });

    let error = null;
    try {
        await service.updateBookingStatus({
            bookingId: 88,
            status: BOOKING_STATUS.COMPLETED,
            auth: { userId: 1, role: "dispatcher", userType: 0 },
        });
    } catch (caughtError) {
        error = caughtError;
    }

    assert.ok(error instanceof AppError);
    assert.equal(error.code, "INVALID_STATUS_TRANSITION");
}

async function testPassengerRateLimiter() {
    const reqBase = {
        method: "POST",
        path: "/api/bookings",
        ip: "10.10.10.10",
        auth: { userId: 9001 },
        headers: {},
        app: { get: () => true },
    };

    let blocked = null;

    for (let index = 0; index < 6; index += 1) {
        const result = await runLimiter({ ...reqBase });
        if (result.blocked) {
            blocked = result;
            break;
        }
    }

    assert.ok(blocked);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.payload.code, "PASSENGER_BOOKING_RATE_LIMITED");
}

const tests = [
    ["create booking success", testCreateBookingSuccess],
    ["concurrent create idempotency", testConcurrentCreate],
    ["assign driver RBAC", testAssignDriverRbac],
    ["assign driver success", testAssignDriverSuccess],
    ["invalid status transition", testInvalidStatusTransition],
    ["passenger rate limiter", testPassengerRateLimiter],
];

let failed = 0;

for (const [name, run] of tests) {
    try {
        await run();
        logPass(name);
    } catch (error) {
        failed += 1;
        logFail(name, error);
    }
}

if (failed > 0) {
    console.error(`Tests failed: ${failed}`);
    process.exit(1);
}

console.log("All booking tests passed.");
process.exit(0);
