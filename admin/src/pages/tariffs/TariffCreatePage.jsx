import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import TariffForm from "./TariffForm";
import {
    buildDefaultTariffRow,
    buildTariffSubmitPayload,
    DEFAULT_ROUTE_FORM,
    hasTariffErrors,
    validateTariffForm,
} from "./tariffFormUtils";
import { createTariff, getTariffMeta } from "../../services/tariffZoneService";
import { buildRolePath } from "../../config/roleRoutes";

export default function TariffCreatePage() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const navigate = useNavigate();

    const [routeForm, setRouteForm] = useState(DEFAULT_ROUTE_FORM);
    const [rides, setRides] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [cityRoutes, setCityRoutes] = useState([]);
    const [selectedRideIds, setSelectedRideIds] = useState([]);
    const [tariffRowsByRide, setTariffRowsByRide] = useState({});
    const [errors, setErrors] = useState({ route: {}, tariffs: {} });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        getTariffMeta()
            .then((data) => {
                setRides(data.rides || []);
                setCurrencies(data.currencies || []);
                setCityRoutes(data.cityRoutes || []);
            })
            .catch((error) => {
                setMessage(error?.response?.data?.message || "Không tải được dữ liệu form.");
            })
            .finally(() => setLoading(false));
    }, []);

    const scope = useMemo(() => Number(routeForm.r_scope), [routeForm.r_scope]);

    function handleRouteChange(field, value) {
        setRouteForm((prev) => {
            const next = { ...prev, [field]: value };

            if (field === "r_scope") {
                if (Number(value) === 0) {
                    next.pickup_city_id = "";
                    next.pick_name = "";
                    next.drop_name = "";
                    next.pick_lng = "";
                    next.pick_lat = "";
                    next.drop_lng = "";
                    next.drop_lat = "";
                } else {
                    next.city_bound_coords = "";
                }
            }

            return next;
        });

        setErrors((prev) => ({
            ...prev,
            route: { ...prev.route, [field]: "" },
        }));
    }

    function handleToggleRide(rideId, checked) {
        setSelectedRideIds((prev) => {
            if (checked) {
                if (prev.includes(rideId)) return prev;
                return [...prev, rideId];
            }

            return prev.filter((id) => id !== rideId);
        });

        if (checked) {
            setTariffRowsByRide((prev) => {
                if (prev[rideId]) return prev;
                return {
                    ...prev,
                    [rideId]: buildDefaultTariffRow(rideId),
                };
            });
        }

        setErrors((prev) => ({ ...prev, tariffs: { ...prev.tariffs, _global: "" } }));
    }

    function handleTariffChange(rideId, field, value) {
        setTariffRowsByRide((prev) => ({
            ...prev,
            [rideId]: {
                ...prev[rideId],
                [field]: value,
            },
        }));

        setErrors((prev) => ({
            ...prev,
            tariffs: {
                ...prev.tariffs,
                [rideId]: {
                    ...(prev.tariffs[rideId] || {}),
                    [field]: "",
                },
            },
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = validateTariffForm(routeForm, selectedRideIds, tariffRowsByRide);
        setErrors(nextErrors);

        if (hasTariffErrors(nextErrors)) {
            setMessage("Vui lòng kiểm tra lại thông tin trước khi lưu.");
            return;
        }

        setSubmitting(true);
        setMessage("");

        try {
            const payload = buildTariffSubmitPayload(routeForm, selectedRideIds, tariffRowsByRide);
            await createTariff(payload);
            navigate(buildRolePath(role, "tariffs"));
        } catch (error) {
            setMessage(error?.response?.data?.message || "Không thể tạo cước phí.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">Đang tải dữ liệu form...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Tariffs</p>
                <h1 className="mt-2 text-3xl font-bold">Tạo mới cước phí di chuyển</h1>
                <p className="mt-2 text-sm text-slate-200">Tạo tuyến và cấu hình giá cho từng loại xe.</p>
            </div>

            {message ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

            <TariffForm
                routeForm={routeForm}
                routeErrors={errors.route}
                rides={rides}
                currencies={currencies}
                cityRoutes={cityRoutes}
                selectedRideIds={selectedRideIds}
                tariffRowsByRide={tariffRowsByRide}
                tariffErrors={errors.tariffs}
                onRouteChange={handleRouteChange}
                onToggleRide={handleToggleRide}
                onTariffChange={handleTariffChange}
                onSubmit={handleSubmit}
                submitLabel="Tạo cước phí"
                submitting={submitting}
                scope={scope}
            />
        </div>
    );
}
