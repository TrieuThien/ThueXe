import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { hasValidCoordinateValue } from "../../components/maps/mapHelpers";
import useGoogleRoute from "../../hooks/useGoogleRoute";
import {
    createBooking,
    estimateBookingRoute,
    getBookingMeta,
    quoteBookingPrice,
} from "../../services/bookingService";
import { BOOKING_TYPE_OPTIONS, PAYMENT_TYPE_OPTIONS } from "../../types/bookingTypes";

const DEFAULT_FORM = {
    user_id: "",
    booking_type: 0,
    route_id: "",
    ride_id: "",
    pickup_address: "",
    pickup_lat: "",
    pickup_long: "",
    dropoff_address: "",
    dropoff_lat: "",
    dropoff_long: "",
    est_distance: "",
    est_duration: "",
    estimated_cost: "",
    actual_cost: "0",
    payment_type: "1",
    scheduled: "0",
    pickup_datetime: "",
    auto_dispatch: "0",
    num_seats: "1",
    cur_symbol: "",
    cur_code: "VND",
};

function normalizePayload(form, role) {
    const payload = {
        route_id: Number(form.route_id),
        ride_id: Number(form.ride_id),
        pickup_address: form.pickup_address,
        pickup_lat: form.pickup_lat || undefined,
        pickup_long: form.pickup_long || undefined,
        dropoff_address: form.dropoff_address,
        dropoff_lat: form.dropoff_lat || undefined,
        dropoff_long: form.dropoff_long || undefined,
        est_distance: form.est_distance ? Number(form.est_distance) : undefined,
        est_duration: form.est_duration ? Number(form.est_duration) : undefined,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
        actual_cost: form.actual_cost ? Number(form.actual_cost) : 0,
        payment_type: Number(form.payment_type),
        scheduled: Number(form.scheduled),
        pickup_datetime: form.pickup_datetime || undefined,
        auto_dispatch: Number(form.auto_dispatch),
        num_seats: Number(form.num_seats),
        cur_symbol: form.cur_symbol || "?",
        cur_code: form.cur_code || "VND",
    };

    if (role !== "passenger") {
        payload.user_id = Number(form.user_id);
    }

    return payload;
}

export default function BookingCreatePage() {
    const outletContext = useOutletContext();
    const location = useLocation();
    const role = outletContext?.role || "admin";
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
    const mapId = import.meta.env.VITE_GOOGLE_MAP_ID?.trim() || undefined;

    const [form, setForm] = useState(DEFAULT_FORM);
    const [meta, setMeta] = useState({ routes: [], rides: [] });
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [placesAutocompleteReady, setPlacesAutocompleteReady] = useState(false);

    const pickupAutocompleteHostRef = useRef(null);
    const dropoffAutocompleteHostRef = useRef(null);
    const mapContainerRef = useRef(null);
    const pickupAutocompleteElementRef = useRef(null);
    const dropoffAutocompleteElementRef = useRef(null);

    const routeOptions = useMemo(() => {
        return (meta.routes || []).filter((route) => Number(route.r_scope) === Number(form.booking_type));
    }, [form.booking_type, meta.routes]);

    const inboundCustomer = useMemo(() => {
        const searchParams = new URLSearchParams(location.search || "");
        const stateCustomer = location.state?.prefillCustomer || {};
        const userIdCandidate = stateCustomer.user_id ?? searchParams.get("customer_id");
        const routeIdCandidate = stateCustomer.route_id ?? searchParams.get("route_id");
        const userId = Number(userIdCandidate);
        const routeId = Number(routeIdCandidate);

        return {
            user_id: Number.isInteger(userId) && userId > 0 ? userId : null,
            full_name: stateCustomer.full_name || searchParams.get("customer_name") || "",
            phone: stateCustomer.phone || searchParams.get("customer_phone") || "",
            email: stateCustomer.email || searchParams.get("customer_email") || "",
            route_id: Number.isInteger(routeId) && routeId > 0 ? routeId : null,
            route_name: stateCustomer.route_name || searchParams.get("route_name") || "",
            address: stateCustomer.address || "",
        };
    }, [location.search, location.state]);

    useEffect(() => {
        if (role === "passenger") return;
        if (!inboundCustomer.user_id) return;

        setForm((prev) => ({
            ...prev,
            user_id: prev.user_id || String(inboundCustomer.user_id),
            route_id: prev.route_id || (inboundCustomer.route_id ? String(inboundCustomer.route_id) : prev.route_id),
        }));
    }, [inboundCustomer.route_id, inboundCustomer.user_id, role]);

    const origin = useMemo(() => {
        if (!hasValidCoordinateValue(form.pickup_lat) || !hasValidCoordinateValue(form.pickup_long)) return null;
        return { lat: Number(form.pickup_lat), lng: Number(form.pickup_long) };
    }, [form.pickup_lat, form.pickup_long]);

    const destination = useMemo(() => {
        if (!hasValidCoordinateValue(form.dropoff_lat) || !hasValidCoordinateValue(form.dropoff_long)) return null;
        return { lat: Number(form.dropoff_lat), lng: Number(form.dropoff_long) };
    }, [form.dropoff_lat, form.dropoff_long]);

    const {
        isReady: mapReady,
        isLoading: mapLoading,
        error: mapError,
        routeInfo,
    } = useGoogleRoute({
        apiKey,
        mapId,
        mapContainerRef,
        origin,
        destination,
        travelMode: "DRIVING",
        enabled: true,
        routingPreference: "TRAFFIC_AWARE",
    });

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    useEffect(() => {
        async function loadMeta() {
            try {
                setLoadingMeta(true);
                const data = await getBookingMeta();
                setMeta({
                    routes: data.routes || [],
                    rides: data.rides || [],
                });
            } catch (error) {
                setErrorMessage(error?.response?.data?.message || "Khong thể tải thông tin tuyến và loại xe.");
            } finally {
                setLoadingMeta(false);
            }
        }

        loadMeta();
    }, []);

    useEffect(() => {
        if (!mapError) return;
        if (mapError === "ROUTES_API_UNAVAILABLE") {
            setErrorMessage("Không thể hiển thị tuyến đường: Routes API chưa sẵn sàng hoặc API key chưa được cấp quyền.");
            return;
        }
        if (mapError === "ROUTE_NOT_FOUND") return;
        if (mapError === "ROUTE_POLYLINE_MISSING") {
            setErrorMessage("Đã lấy được tuyến nhưng không thể render đường đi. Vui lòng thử lại địa chỉ cụ thể hơn.");
            return;
        }
        setErrorMessage("Không thể hiển thị tuyến đường trên bản đồ.");
    }, [mapError]);

    useEffect(() => {
        if (!window.google?.maps?.places || !pickupAutocompleteHostRef.current || !dropoffAutocompleteHostRef.current) {
            return undefined;
        }

        const pickupElement = new window.google.maps.places.PlaceAutocompleteElement({
            placeholder: "Nhập điểm đón",
        });
        const dropoffElement = new window.google.maps.places.PlaceAutocompleteElement({
            placeholder: "Nhập điểm đến",
        });

        pickupElement.className = "w-full";
        dropoffElement.className = "w-full";
        pickupElement.style.display = "block";
        dropoffElement.style.display = "block";
        pickupElement.style.height = "40px";
        dropoffElement.style.height = "40px";
        pickupElement.style.width = "100%";
        dropoffElement.style.width = "100%";

        pickupAutocompleteHostRef.current.innerHTML = "";
        dropoffAutocompleteHostRef.current.innerHTML = "";
        pickupAutocompleteHostRef.current.appendChild(pickupElement);
        dropoffAutocompleteHostRef.current.appendChild(dropoffElement);
        setPlacesAutocompleteReady(true);

        pickupAutocompleteElementRef.current = pickupElement;
        dropoffAutocompleteElementRef.current = dropoffElement;

        const applySelectedPlace = async (event, type) => {
            const placePrediction = event?.placePrediction;
            const selectedPlace = placePrediction?.toPlace ? placePrediction.toPlace() : event?.place;
            if (!selectedPlace) return;

            if (typeof selectedPlace.fetchFields === "function") {
                await selectedPlace.fetchFields({
                    fields: ["formattedAddress", "displayName", "location"],
                });
            }

            const lat = selectedPlace?.location?.lat?.();
            const lng = selectedPlace?.location?.lng?.();
            const address = selectedPlace?.formattedAddress || selectedPlace?.displayName || "";

            if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address) return;

            if (type === "pickup") {
                setForm((prev) => ({
                    ...prev,
                    pickup_address: address,
                    pickup_lat: String(lat),
                    pickup_long: String(lng),
                }));
                return;
            }

            setForm((prev) => ({
                ...prev,
                dropoff_address: address,
                dropoff_lat: String(lat),
                dropoff_long: String(lng),
            }));
        };

        const pickupListener = (event) => {
            applySelectedPlace(event, "pickup").catch(() => {
                setErrorMessage("Không thể lấy thông tin địa điểm đón.");
            });
        };
        const dropoffListener = (event) => {
            applySelectedPlace(event, "dropoff").catch(() => {
                setErrorMessage("Không thể lấy thông tin địa điểm đến.");
            });
        };

        pickupElement.addEventListener("gmp-select", pickupListener);
        pickupElement.addEventListener("gmp-placeselect", pickupListener);
        dropoffElement.addEventListener("gmp-select", dropoffListener);
        dropoffElement.addEventListener("gmp-placeselect", dropoffListener);

        return () => {
            pickupElement.removeEventListener("gmp-select", pickupListener);
            pickupElement.removeEventListener("gmp-placeselect", pickupListener);
            dropoffElement.removeEventListener("gmp-select", dropoffListener);
            dropoffElement.removeEventListener("gmp-placeselect", dropoffListener);
            if (pickupAutocompleteHostRef.current?.contains(pickupElement)) {
                pickupAutocompleteHostRef.current.removeChild(pickupElement);
            }
            if (dropoffAutocompleteHostRef.current?.contains(dropoffElement)) {
                dropoffAutocompleteHostRef.current.removeChild(dropoffElement);
            }
            if (pickupAutocompleteHostRef.current) pickupAutocompleteHostRef.current.innerHTML = "";
            if (dropoffAutocompleteHostRef.current) dropoffAutocompleteHostRef.current.innerHTML = "";
            pickupAutocompleteElementRef.current = null;
            dropoffAutocompleteElementRef.current = null;
            setPlacesAutocompleteReady(false);
        };
    }, [mapReady, mapLoading, mapError]);

    useEffect(() => {
        const pickupElement = pickupAutocompleteElementRef.current;
        const dropoffElement = dropoffAutocompleteElementRef.current;
        if (pickupElement && pickupElement.value !== form.pickup_address) {
            pickupElement.value = form.pickup_address || "";
        }
        if (dropoffElement && dropoffElement.value !== form.dropoff_address) {
            dropoffElement.value = form.dropoff_address || "";
        }
    }, [form.pickup_address, form.dropoff_address]);

    useEffect(() => {
        const hasCoords =
            hasValidCoordinateValue(form.pickup_lat) &&
            hasValidCoordinateValue(form.pickup_long) &&
            hasValidCoordinateValue(form.dropoff_lat) &&
            hasValidCoordinateValue(form.dropoff_long);

        if (!hasCoords || !form.route_id || !form.ride_id) return;

        async function calculate() {
            try {
                setCalculating(true);

                const routeEstimate = await estimateBookingRoute({
                    pickup_lat: form.pickup_lat,
                    pickup_lng: form.pickup_long,
                    dropoff_lat: form.dropoff_lat,
                    dropoff_lng: form.dropoff_long,
                    route_scope: form.booking_type,
                });

                const quote = await quoteBookingPrice({
                    route_id: Number(form.route_id),
                    ride_id: Number(form.ride_id),
                    pickup_lat: Number(form.pickup_lat),
                    pickup_lng: Number(form.pickup_long),
                    dropoff_lat: Number(form.dropoff_lat),
                    dropoff_lng: Number(form.dropoff_long),
                    distance_km: routeEstimate.distance_km,
                    duration_min: routeEstimate.duration_min,
                    pickup_datetime: form.pickup_datetime || undefined,
                });

                setForm((prev) => ({
                    ...prev,
                    est_distance: String(quote.distance_km),
                    est_duration: String(quote.duration_min),
                    estimated_cost: String(quote.estimated_cost),
                    cur_symbol: quote.cur_symbol || prev.cur_symbol,
                    cur_code: quote.cur_code || prev.cur_code,
                }));
            } catch (error) {
                setErrorMessage(error?.response?.data?.message || "Không thể tính giá tự động.");
            } finally {
                setCalculating(false);
            }
        }

        calculate();
    }, [
        form.pickup_lat,
        form.pickup_long,
        form.dropoff_lat,
        form.dropoff_long,
        form.route_id,
        form.ride_id,
        form.booking_type,
        form.pickup_datetime,
    ]);

    useEffect(() => {
        if (!mapReady || !window.google?.maps?.Geocoder) return;

        const needsPickupCoords =
            form.pickup_address?.trim() &&
            (!Number.isFinite(Number(form.pickup_lat)) || !Number.isFinite(Number(form.pickup_long)));
        const needsDropoffCoords =
            form.dropoff_address?.trim() &&
            (!Number.isFinite(Number(form.dropoff_lat)) || !Number.isFinite(Number(form.dropoff_long)));

        if (!needsPickupCoords && !needsDropoffCoords) return;

        const geocoder = new window.google.maps.Geocoder();
        const geocodeAddress = (address) =>
            new Promise((resolve) => {
                geocoder.geocode({ address }, (results, status) => {
                    if (status === "OK" && Array.isArray(results) && results[0]?.geometry?.location) {
                        resolve(results[0].geometry.location);
                        return;
                    }

                    resolve(null);
                });
            });

        let cancelled = false;
        async function runGeocode() {
            if (needsPickupCoords) {
                const location = await geocodeAddress(form.pickup_address);
                if (!cancelled && location) {
                    setForm((prev) => ({
                        ...prev,
                        pickup_lat: String(location.lat()),
                        pickup_long: String(location.lng()),
                    }));
                }
            }

            if (needsDropoffCoords) {
                const location = await geocodeAddress(form.dropoff_address);
                if (!cancelled && location) {
                    setForm((prev) => ({
                        ...prev,
                        dropoff_lat: String(location.lat()),
                        dropoff_long: String(location.lng()),
                    }));
                }
            }
        }

        runGeocode();
        return () => {
            cancelled = true;
        };
    }, [
        mapReady,
        form.pickup_address,
        form.pickup_lat,
        form.pickup_long,
        form.dropoff_address,
        form.dropoff_lat,
        form.dropoff_long,
    ]);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
        setSubmitting(true);

        try {
            if (form.scheduled === "1") {
                if (!form.pickup_datetime) {
                    throw new Error("Vui lÃ²ng chá»n thá»i gian háº¹n Ä‘Ã³n.");
                }

                const scheduleDate = new Date(form.pickup_datetime);
                if (Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() < Date.now() + 10 * 60 * 1000) {
                    throw new Error("Thá»i gian háº¹n pháº£i sau hiá»‡n táº¡i Ã­t nháº¥t 10 phÃºt.");
                }
            }

            const result = await createBooking(normalizePayload(form, role));
            setSuccessMessage(`Tạo mới yêu cầu #${result.booking?.id || "--"} thành công.`);
            setForm((prev) => ({
                ...DEFAULT_FORM,
                booking_type: prev.booking_type,
                route_id: prev.route_id,
                ride_id: prev.ride_id,
                user_id: prev.user_id,
            }));
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message || "Không thể tạo yêu cầu.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-5">
            <section className="rounded-[24px] bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 px-6 py-6 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Booking</p>
                <h1 className="mt-2 text-3xl font-bold">Tạo mới yêu cầu</h1>
                <p className="mt-2 text-sm text-slate-200">Tạo đặt xe ngay hoặc hẹn đặt với điều kiện tự động.</p>
            </section>

            {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
            {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

            <form onSubmit={handleSubmit} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Thông tin người đặt</span>
                        {role !== "passenger" ? <input value={form.user_id} onChange={(event) => updateField("user_id", event.target.value)} placeholder="ID khách hàng" className="rounded-xl border border-slate-300 px-3 py-2" required /> : null}
                        {role !== "passenger" && inboundCustomer.user_id ? (
                            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
                                <p className="font-semibold">Thông tin khách hàng từ danh sách</p>
                                <p>ID: {inboundCustomer.user_id} {inboundCustomer.full_name ? `- ${inboundCustomer.full_name}` : ""}</p>
                                {inboundCustomer.phone ? <p>SĐT: {inboundCustomer.phone}</p> : null}
                                {inboundCustomer.email ? <p>Email: {inboundCustomer.email}</p> : null}
                                {inboundCustomer.address ? <p>Địa chỉ: {inboundCustomer.address}</p> : null}
                                {inboundCustomer.route_name ? <p>Khu vực khách hàng: {inboundCustomer.route_name}</p> : null}
                            </div>
                        ) : null}
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Phạm vi di chuyển</span>
                        <select value={form.booking_type} onChange={(event) => updateField("booking_type", Number(event.target.value))} className="rounded-xl border border-slate-300 bg-white px-3 py-2">{BOOKING_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>

                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Khu vực</span>
                        <select value={form.route_id} onChange={(event) => updateField("route_id", event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2" disabled={loadingMeta} required><option value="">{loadingMeta ? "Đang tải khu vực..." : "Chọn khu vực"}</option>{routeOptions.map((route) => <option key={route.id} value={route.id}>{route.r_title}</option>)}</select>
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Loại xe</span>
                        <select value={form.ride_id} onChange={(event) => updateField("ride_id", event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2" disabled={loadingMeta} required><option value="">{loadingMeta ? "Đang tải loại xe..." : "Chọn loại xe"}</option>{(meta.rides || []).map((ride) => <option key={ride.id} value={ride.id}>{ride.ride_type}</option>)}</select>
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Điểm đón</span>
                        <div ref={pickupAutocompleteHostRef} className="h-[42px] w-full rounded-xl border border-slate-300 bg-white px-1" />
                        {!placesAutocompleteReady ? (
                            <input
                                value={form.pickup_address}
                                onChange={(event) => updateField("pickup_address", event.target.value)}
                                placeholder="Nhập điểm đón"
                                className="rounded-xl border border-slate-300 px-3 py-2"
                            />
                        ) : null}
                        {form.pickup_address ? <p className="text-xs text-slate-500">{form.pickup_address}</p> : null}

                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Điểm đến</span>
                        <div ref={dropoffAutocompleteHostRef} className="h-[42px] w-full rounded-xl border border-slate-300 bg-white px-1" />
                        {!placesAutocompleteReady ? (
                            <input
                                value={form.dropoff_address}
                                onChange={(event) => updateField("dropoff_address", event.target.value)}
                                placeholder="Nhập điểm đến"
                                className="rounded-xl border border-slate-300 px-3 py-2"
                            />
                        ) : null}
                        {form.dropoff_address ? <p className="text-xs text-slate-500">{form.dropoff_address}</p> : null}
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Phương thức thanh toán</span>
                        <select value={form.payment_type} onChange={(event) => updateField("payment_type", event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2">{PAYMENT_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Lên lịch</span>
                        <select value={form.scheduled} onChange={(event) => updateField("scheduled", event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2"><option value="0">Đặt ngay</option><option value="1">Hạn đặt xe</option></select>
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Thời gian đón</span>
                        <input type="datetime-local" value={form.pickup_datetime} onChange={(event) => updateField("pickup_datetime", event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" />
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Số lượng khách</span>
                        <input value={form.num_seats} onChange={(event) => updateField("num_seats", event.target.value)} placeholder="Số chỗ" className="rounded-xl border border-slate-300 px-3 py-2" />
                    </label>
                    <label className="flex flex-col gap-2">
                        <span className="block text-sm font-medium text-slate-700">Cước phí</span>
                        <div className="text-sm text-slate-600">{calculating ? "Đang tính giá tự động..." : `Ước tính: ${form.cur_symbol}${form.estimated_cost || 0} (${form.est_distance || 0} km / ${form.est_duration || 0} phút)`}</div>
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.auto_dispatch === "1"} onChange={(event) => updateField("auto_dispatch", event.target.checked ? "1" : "0")} /> Tự động điều phối tài xế phù hợp</label>

                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                    <div ref={mapContainerRef} className="h-[320px] w-full bg-slate-100" />
                </div>
                {mapLoading ? <p className="mt-2 text-xs text-slate-500">Đang tải bản đồ...</p> : null}
                {routeInfo?.distanceKm ? <p className="mt-2 text-xs text-slate-500">Tuyến hiện tại: {routeInfo.distanceKm} km {routeInfo.durationText ? `• ${routeInfo.durationText}` : ""}</p> : null}

                <div className="mt-6">
                    <button type="submit" disabled={submitting} className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Đang tạo..." : "Tạo yêu cầu"}</button>
                </div>
            </form>
        </div>
    );
}
