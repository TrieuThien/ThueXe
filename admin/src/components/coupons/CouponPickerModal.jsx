import { useEffect, useMemo, useState } from "react";
import { applyCoupon, getAvailableCoupons, validateCoupon } from "../../services/couponService";

function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN");
}

function ruleText(coupon) {
    if (!coupon) return "--";
    if (Number(coupon.discount_type) === 0) {
        return `Giảm ${coupon.discount_value}%${Number(coupon.max_discount_amount) > 0 ? `, tối đa ${formatMoney(coupon.max_discount_amount)}` : ""}`;
    }
    return `Giảm ${formatMoney(coupon.discount_value)}`;
}

export default function CouponPickerModal({
    open,
    onClose,
    cityId,
    rideId,
    vehicleId,
    fare,
    onSelect,
}) {
    const [couponCodeInput, setCouponCodeInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [applyingId, setApplyingId] = useState(null);
    const [items, setItems] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [validateResult, setValidateResult] = useState(null);

    const selectedVehicleId = useMemo(() => Number(rideId || vehicleId || 0), [rideId, vehicleId]);

    async function loadAvailable() {
        if (!open) return;
        if (!cityId || !selectedVehicleId) return;

        setLoading(true);
        setErrorMessage("");
        setValidateResult(null);

        try {
            const data = await getAvailableCoupons({
                cityId,
                rideId: selectedVehicleId,
                fare,
            });
            setItems(data.items || []);
        } catch (error) {
            setItems([]);
            setErrorMessage(error?.response?.data?.message || "Không tải được mã giảm giá khả dụng.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAvailable();
    }, [open, cityId, selectedVehicleId, fare]);

    async function handleCheckCode() {
        setValidateResult(null);
        setErrorMessage("");

        if (!String(couponCodeInput || "").trim()) {
            setErrorMessage("Vui lòng nhập mã giảm giá.");
            return;
        }

        try {
            const result = await validateCoupon({
                couponCode: String(couponCodeInput).trim(),
                cityId,
                rideId: selectedVehicleId,
                fare,
            });
            setValidateResult(result);
        } catch (error) {
            setValidateResult(null);
            setErrorMessage(error?.response?.data?.message || "Không thể kiểm tra mã giảm giá.");
        }
    }

    async function handleApply(couponCode) {
        setApplyingId(couponCode);
        setErrorMessage("");

        try {
            const result = await applyCoupon({
                couponCode,
                cityId,
                rideId: selectedVehicleId,
                fare,
            });
            onSelect?.(result);
            onClose?.();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể áp dụng mã giảm giá.");
        } finally {
            setApplyingId(null);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Chọn mã giảm giá</h2>
                        <p className="mt-1 text-sm text-slate-500">Giá chuyến hiện tại: {formatMoney(fare)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Đóng
                    </button>
                </div>

                <section className="mt-4 rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">Nhập mã thủ công</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                            type="text"
                            value={couponCodeInput}
                            onChange={(event) => setCouponCodeInput(event.target.value.toUpperCase())}
                            placeholder="Nhập mã giảm giá"
                            className="min-h-11 flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <button
                            type="button"
                            onClick={handleCheckCode}
                            className="min-h-11 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                        >
                            Kiểm tra mã
                        </button>
                    </div>

                    {validateResult ? (
                        <div
                            className={`mt-3 rounded-2xl px-4 py-3 text-sm ${validateResult.valid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                }`}
                        >
                            <p>{validateResult.message}</p>
                            <p className="mt-1">
                                Giảm: <span className="font-semibold">{formatMoney(validateResult.discountAmount)}</span> | Còn lại:{" "}
                                <span className="font-semibold">{formatMoney(validateResult.finalFare)}</span>
                            </p>
                            {validateResult.valid ? (
                                <button
                                    type="button"
                                    onClick={() => handleApply(validateResult.coupon?.coupon_code || couponCodeInput)}
                                    className="mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                                >
                                    Áp dụng mã này
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </section>

                <section className="mt-4">
                    <h3 className="text-sm font-bold text-slate-900">Mã công khai khả dụng</h3>

                    {loading ? (
                        <p className="mt-3 rounded-2xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                            Đang tải danh sách mã...
                        </p>
                    ) : items.length === 0 ? (
                        <p className="mt-3 rounded-2xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                            Không có mã công khai nào phù hợp điều kiện hiện tại.
                        </p>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {items.map((item) => (
                                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{item.coupon_code}</p>
                                            <p className="text-sm text-slate-700">{item.coupon_title || "Chương trình ưu đãi"}</p>
                                            <p className="mt-1 text-xs text-slate-600">{item.rule_text || ruleText(item)}</p>
                                            <p className="mt-1 text-xs text-slate-600">
                                                Đơn tối thiểu: {formatMoney(item.min_fare)} • Hết hạn:{" "}
                                                {new Date(item.expiry_date).toLocaleString("vi-VN")}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={applyingId === item.coupon_code}
                                            onClick={() => handleApply(item.coupon_code)}
                                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                                        >
                                            {applyingId === item.coupon_code ? "Đang áp dụng..." : "Chọn mã"}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                {errorMessage ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}
            </div>
        </div>
    );
}

