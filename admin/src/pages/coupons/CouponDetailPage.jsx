import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { buildRolePath } from "../../config/roleRoutes";
import { getAdminCouponDetail } from "../../services/couponService";
import {
    formatMoney,
    getCouponExpiryBadge,
    getCouponStatusBadge,
    getCouponVisibilityBadge,
} from "./couponFormUtils";

function formatDateTime(dateValue) {
    if (!dateValue) return "--";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString("vi-VN");
}

export default function CouponDetailPage() {
    const { id } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";

    const [coupon, setCoupon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        getAdminCouponDetail(id)
            .then((data) => {
                setCoupon(data.coupon || null);
            })
            .catch((error) => {
                setErrorMessage(error?.response?.data?.message || "Không tải được chi tiết mã giảm giá.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-sm text-slate-600">Đang tải dữ liệu chi tiết...</div>;
    }

    if (errorMessage || !coupon) {
        return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage || "Không tìm thấy mã giảm giá."}</p>;
    }

    const statusBadge = getCouponStatusBadge(coupon);
    const visibilityBadge = getCouponVisibilityBadge(coupon);
    const expiryBadge = getCouponExpiryBadge(coupon);

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Coupons</p>
                <h1 className="mt-2 text-3xl font-bold">Chi tiết mã {coupon.coupon_code}</h1>
                <div className="mt-4 flex flex-wrap gap-2">
                    {[statusBadge, visibilityBadge, expiryBadge].map((badge) => (
                        <span
                            key={badge.label}
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                        >
                            {badge.label}
                        </span>
                    ))}
                </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <p><span className="font-semibold text-slate-700">Tiêu đề:</span> {coupon.coupon_title || "--"}</p>
                    <p><span className="font-semibold text-slate-700">Thành phố:</span> {coupon.city_name || `#${coupon.city}`}</p>
                    <p><span className="font-semibold text-slate-700">Loại giảm:</span> {Number(coupon.discount_type) === 0 ? "Phần trăm" : "Số tiền cố định"}</p>
                    <p><span className="font-semibold text-slate-700">Giá trị giảm:</span> {Number(coupon.discount_type) === 0 ? `${coupon.discount_value}%` : formatMoney(coupon.discount_value)}</p>
                    <p><span className="font-semibold text-slate-700">Đơn tối thiểu:</span> {formatMoney(coupon.min_fare)}</p>
                    <p><span className="font-semibold text-slate-700">Giảm tối đa:</span> {formatMoney(coupon.max_discount_amount)}</p>
                    <p><span className="font-semibold text-slate-700">Giới hạn tổng:</span> {coupon.limit_count === 0 ? "Không giới hạn" : coupon.limit_count}</p>
                    <p><span className="font-semibold text-slate-700">Giới hạn mỗi user:</span> {coupon.user_limit_count === 0 ? "Không giới hạn" : coupon.user_limit_count}</p>
                    <p><span className="font-semibold text-slate-700">Đã dùng:</span> {coupon.total_used}</p>
                    <p><span className="font-semibold text-slate-700">Bắt đầu:</span> {formatDateTime(coupon.active_date)}</p>
                    <p><span className="font-semibold text-slate-700">Hết hạn:</span> {formatDateTime(coupon.expiry_date)}</p>
                    <p><span className="font-semibold text-slate-700">Ngày tạo:</span> {formatDateTime(coupon.date_created)}</p>
                    <p className="md:col-span-2 xl:col-span-3">
                        <span className="font-semibold text-slate-700">Xe áp dụng:</span>{" "}
                        {Array.isArray(coupon.vehicle_ids) && coupon.vehicle_ids.length ? coupon.vehicle_ids.join(", ") : "Tất cả xe"}
                    </p>
                </div>
            </section>

            <div className="flex gap-3">
                <Link
                    to={buildRolePath(role, "coupons")}
                    className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Quay lại danh sách
                </Link>
                <Link
                    to={buildRolePath(role, `coupons/${coupon.id}/edit`)}
                    className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                    Chỉnh sửa
                </Link>
            </div>
        </div>
    );
}

