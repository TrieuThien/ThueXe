/**
 * rideDispatchService.js
 *
 * GPS-based realtime ride dispatch engine.
 *
 * Flow:
 *  1. startRideDispatch(bookingId, lat, lng) is called fire-and-forget after booking creation.
 *  2. findNearbyDriversForRide() finds the closest available driver (≤2 km, expands to 5 km if empty).
 *  3. An allocation record (driver_allocate) is inserted with expires_at = NOW() + 30s.
 *  4. An SSE event is pushed to the driver: NEW_RIDE_REQUEST.
 *  5. A 30-second timer fires and, if the allocation is still pending, marks it as timeout and moves to the next driver.
 *  6. notifyDriverAccepted() / notifyDriverRejected() are called by the driver booking service
 *     when the driver explicitly responds via the mobile app.
 *  7. If no driver is found after exhausting all candidates in both radii, or the 60-second overall
 *     timeout elapses, the booking stays PENDING and admins are notified to assign manually.
 *
 * Concurrency safety:
 *  - bookingDispatchLock: in-memory Set prevents concurrent dispatch loops for the same booking.
 *  - atomicAssignDriverToBooking(): UPDATE WHERE driver_id IS NULL ensures only one driver wins.
 */

import { publishRealtimeEvent } from "../utils/realtime.js";
import {
    findNearbyDriversForRide,
    incrementBookingDispatchAttempts,
    createDispatchAllocation,
    timeoutDispatchAllocation,
    getBookingDispatchState,
    getTriedDriverIdsForBooking,
} from "../repositories/bookingRepository.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEOUT_MS                  = 30_000; // 30 seconds per driver
const OVERALL_DISPATCH_TIMEOUT_MS = 60_000; // 60 seconds max for auto-dispatch before manual handoff
const INITIAL_RADIUS_KM           = 2;
const EXPANDED_RADIUS_KM          = 5;

// ─── In-memory state ──────────────────────────────────────────────────────────

/** Prevents two dispatch loops running for the same booking simultaneously. */
const bookingDispatchLock = new Set();

/** Map of bookingId → per-driver timer handle (30s per driver). */
const pendingTimers = new Map();

/** Map of bookingId → overall dispatch timeout handle (60s total). */
const dispatchOverallTimers = new Map();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the dispatch loop for a newly created booking.
 * Call without await — this is fire-and-forget.
 * Auto-dispatch runs for a maximum of 60 seconds. If no driver accepts within that window,
 * the booking stays PENDING and admins are notified to assign manually.
 */
export function startRideDispatch(bookingId, pickupLat, pickupLng) {
    if (bookingDispatchLock.has(bookingId)) return;
    bookingDispatchLock.add(bookingId);

    // Overall 60-second ceiling — fires if no driver accepted before the window closes
    const overallTimer = setTimeout(async () => {
        dispatchOverallTimers.delete(bookingId);
        _clearTimer(bookingId);               // stop any pending per-driver 30s timer
        bookingDispatchLock.delete(bookingId); // release the loop lock
        await _notifyNeedsManualDispatch(bookingId).catch((err) =>
            console.error(`[RideDispatch] notifyNeedsManualDispatch error for booking ${bookingId}:`, err)
        );
    }, OVERALL_DISPATCH_TIMEOUT_MS);
    dispatchOverallTimers.set(bookingId, overallTimer);

    _dispatchLoop(bookingId, pickupLat, pickupLng, false)
        .catch((err) =>
            console.error(`[RideDispatch] Unhandled error for booking ${bookingId}:`, err)
        )
        .finally(() => bookingDispatchLock.delete(bookingId));
}

/**
 * Called by the driver booking service when a driver explicitly ACCEPTS.
 * Clears the pending timeout timer so it does not cascade to the next driver.
 * Emits RIDE_DRIVER_ACCEPTED SSE to the customer.
 *
 * @param {number} bookingId
 * @param {number} driverId
 * @param {number} customerId  - booking.user_id (for SSE targeting)
 * @param {object} driverInfo  - { firstname, lastname, phone, driver_rating, current_lat, current_lng }
 */
export function notifyRideAccepted(bookingId, driverId, customerId, driverInfo) {
    _clearTimer(bookingId);
    _clearOverallTimer(bookingId);

    publishRealtimeEvent(
        "RIDE_DRIVER_ACCEPTED",
        {
            booking_id: bookingId,
            driver_id:  driverId,
            driver:     driverInfo,
        },
        { targetUserIds: [customerId] }
    );
}

/**
 * Called by the driver booking service when a driver explicitly REJECTS.
 * Clears the pending timer and triggers the next dispatch iteration immediately.
 *
 * @param {number} bookingId
 * @param {number} customerId
 * @param {number} pickupLat
 * @param {number} pickupLng
 */
export function notifyRideRejected(bookingId, customerId, pickupLat, pickupLng) {
    _clearTimer(bookingId);

    // Resume dispatch from next candidate (fire-and-forget)
    if (!bookingDispatchLock.has(bookingId)) {
        bookingDispatchLock.add(bookingId);
        _dispatchLoop(bookingId, pickupLat, pickupLng, false)
            .catch((err) =>
                console.error(`[RideDispatch] Resume error for booking ${bookingId}:`, err)
            )
            .finally(() => bookingDispatchLock.delete(bookingId));
    }

    publishRealtimeEvent(
        "RIDE_DRIVER_SEARCHING",
        { booking_id: bookingId, message: "Tài xế không nhận, đang tìm tài xế khác..." },
        { targetUserIds: [customerId] }
    );
}

// ─── Internal dispatch logic ──────────────────────────────────────────────────

async function _dispatchLoop(bookingId, lat, lng, expandedSearch) {
    // Guard: bail if booking is already assigned or terminal
    const state = await getBookingDispatchState(bookingId);
    if (!state || state.status !== 0 || state.driver_id !== null) {
        console.log(`[RideDispatch] booking=${bookingId} skipped: status=${state?.status} driver=${state?.driver_id}`);
        bookingDispatchLock.delete(bookingId);
        return;
    }

    const triedIds   = await getTriedDriverIdsForBooking(bookingId);
    const radiusKm   = expandedSearch ? EXPANDED_RADIUS_KM : INITIAL_RADIUS_KM;
    const candidates = await findNearbyDriversForRide(lat, lng, radiusKm, triedIds);

    console.log(`[RideDispatch] booking=${bookingId} lat=${lat} lng=${lng} radius=${radiusKm}km candidates=${candidates.length} tried=${triedIds.length}`);

    if (candidates.length === 0) {
        if (!expandedSearch) {
            // Expand search radius and retry once
            return _dispatchLoop(bookingId, lat, lng, true);
        }

        // All candidates exhausted — hand off to manual dispatch instead of cancelling
        console.log(`[RideDispatch] booking=${bookingId} exhausted candidates → requesting manual dispatch`);
        _clearOverallTimer(bookingId); // already handling this case here
        await _notifyNeedsManualDispatch(bookingId).catch((err) =>
            console.error(`[RideDispatch] notifyNeedsManualDispatch error for booking ${bookingId}:`, err)
        );
        return;
    }

    // Pick the nearest candidate
    const driver = candidates[0];

    await incrementBookingDispatchAttempts(bookingId);

    const expiresAt = new Date(Date.now() + TIMEOUT_MS);
    const allocationId = await createDispatchAllocation({
        bookingId,
        driverId: driver.driver_id,
        expiresAt,
    });

    console.log(`[RideDispatch] booking=${bookingId} → dispatching to driver=${driver.driver_id} (${Number(driver.distance_km).toFixed(2)}km)`);

    // Notify the driver via SSE (state already fetched at top of _dispatchLoop)
    publishRealtimeEvent(
        "NEW_RIDE_REQUEST",
        {
            allocation_id:   allocationId,
            booking_id:      bookingId,
            expires_at:      expiresAt.toISOString(),
            timeout_sec:     TIMEOUT_MS / 1000,
            pickup_address:  state.pickup_address  ?? null,
            dropoff_address: state.dropoff_address ?? null,
            estimated_cost:  state.estimated_cost  ?? null,
            pickup: {
                lat:         lat,
                lng:         lng,
                distance_km: driver.distance_km,
            },
        },
        { targetUserIds: [driver.driver_id] }
    );

    // Schedule timeout — runs if the driver does not respond within 30s
    const timer = setTimeout(async () => {
        pendingTimers.delete(bookingId);

        const updated = await timeoutDispatchAllocation(allocationId);
        if (!updated) return; // Already responded (accepted or rejected)

        // Continue to next driver (re-enter dispatch loop — lock was released after first iteration)
        if (!bookingDispatchLock.has(bookingId)) {
            bookingDispatchLock.add(bookingId);
            _dispatchLoop(bookingId, lat, lng, expandedSearch)
                .catch((err) =>
                    console.error(`[RideDispatch] Timeout cascade error for booking ${bookingId}:`, err)
                )
                .finally(() => bookingDispatchLock.delete(bookingId));
        }
    }, TIMEOUT_MS);

    pendingTimers.set(bookingId, { timer, allocationId });

    // Release lock so the timeout callback can re-enter
    bookingDispatchLock.delete(bookingId);
}

function _clearTimer(bookingId) {
    const entry = pendingTimers.get(bookingId);
    if (entry) {
        clearTimeout(entry.timer);
        pendingTimers.delete(bookingId);
    }
}

function _clearOverallTimer(bookingId) {
    const timer = dispatchOverallTimers.get(bookingId);
    if (timer) {
        clearTimeout(timer);
        dispatchOverallTimers.delete(bookingId);
    }
}

/**
 * Called when auto-dispatch exhausts all candidates or the 60s overall timeout fires.
 * Booking stays PENDING — notifies admins via SSE broadcast to assign manually,
 * and notifies the customer that we're still working on it.
 */
async function _notifyNeedsManualDispatch(bookingId) {
    const state = await getBookingDispatchState(bookingId).catch(() => null);
    if (!state || state.status !== 0 || state.driver_id !== null) return; // already handled

    console.log(`[RideDispatch] booking=${bookingId} NEEDS_MANUAL_DISPATCH`);

    // Broadcast to all connected SSE clients (admin/dispatcher dashboards)
    publishRealtimeEvent("RIDE_NEEDS_MANUAL_DISPATCH", {
        booking_id:      bookingId,
        message:         "Không tìm được tài xế tự động. Cần gán thủ công.",
        pickup_address:  state.pickup_address  ?? null,
        dropoff_address: state.dropoff_address ?? null,
        estimated_cost:  state.estimated_cost  ?? null,
    });

    // Notify the customer so they know we're still working on it
    if (state.user_id) {
        publishRealtimeEvent(
            "RIDE_AWAITING_MANUAL_DISPATCH",
            {
                booking_id: bookingId,
                message:    "Đang tìm tài xế, vui lòng chờ thêm.",
            },
            { targetUserIds: [state.user_id] }
        );
    }
}
