import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { buildRolePath } from "../../config/roleRoutes";
import { createAdminCoupon, getCouponMeta } from "../../services/couponService";
import CouponForm from "./CouponForm";
import {
    buildCouponSubmitPayload,
    DEFAULT_COUPON_FORM,
    hasCouponErrors,
    validateCouponForm,
} from "./couponFormUtils";

export default function CouponCreatePage() {
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const navigate = useNavigate();

    const [form, setForm] = useState(DEFAULT_COUPON_FORM);
    const [errors, setErrors] = useState({});
    const [cities, setCities] = useState([]);
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        getCouponMeta()
            .then((data) => {
                setCities(data.cities || []);
                setRides(data.rides || []);
            })
            .catch((error) => {
                setMessage(error?.response?.data?.message || "Không tải được dữ liệu form.");
            })
            .finally(() => setLoading(false));
    }, []);

    function handleChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    function handleToggleRide(rideId, checked) {
        setForm((prev) => {
            const current = Array.isArray(prev.vehicles) ? prev.vehicles : [];
            const next = checked
                ? [...new Set([...current, Number(rideId)])]
                : current.filter((item) => Number(item) !== Number(rideId));
            return { ...prev, vehicles: next };
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const nextErrors = validateCouponForm(form);
        setErrors(nextErrors);

        if (hasCouponErrors(nextErrors)) {
            setMessage("Vui lòng kiểm tra lại thông tin trước khi lưu.");
            return;
        }

        setSubmitting(true);
        setMessage("");

        try {
            const payload = buildCouponSubmitPayload(form);
            await createAdminCoupon(payload);
            navigate(buildRolePath(role, "coupons"));
        } catch (error) {
            setMessage(error?.response?.data?.message || "Không thể tạo mã giảm giá.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">Đang tải dữ liệu form...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 text-white">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Coupons</p>
                    <h1 className="mt-2 text-3xl font-bold">Tạo mã giảm giá mới</h1>
                    <p className="mt-2 text-sm text-slate-200">Thiết lập mã, điều kiện và phạm vi áp dụng cho chuyến đi.</p>
                </div>

                <div>

                    <button
                        type="button"
                        onClick={() => navigate(buildRolePath(role, "coupons"))}
                        className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                    >
                        Quay lại quản lý mã giảm giá
                    </button>
                </div>


            </div>

            {message ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

            <CouponForm
                form={form}
                errors={errors}
                cities={cities}
                rides={rides}
                submitting={submitting}
                submitLabel="Tạo mã giảm giá"
                onChange={handleChange}
                onToggleRide={handleToggleRide}
                onSubmit={handleSubmit}
            />
        </div>
    );
}

