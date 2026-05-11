import { useEffect, useState } from "react";
import { getRentalBookingDetail } from "../../services/rentalBookingService";

const SERVICE_TYPE_LABEL = { 1: "Thuê xe", 2: "Thuê tài xế", 3: "Xe + tài xế" };

const STATUS_LABEL = {
    scheduled: "Đã lên lịch",
    pending: "Chờ xử lý",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
};

const PAYMENT_STATUS_LABEL = { pending: "Chờ thanh toán", paid: "Đã thanh toán", refunded: "Đã hoàn tiền" };
const PAYMENT_TYPE_LABEL = { 1: "Ví điện tử", 2: "Tiền mặt" };

function formatCurrency(amount) {
    if (!amount && amount !== 0) return "—";
    return Number(amount).toLocaleString("vi-VN") + "đ";
}

function formatDatetime(val) {
    if (!val) return "—";
    return new Date(val).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function InfoRow({ label, value }) {
    return (
        <div className="flex border-b border-slate-200 py-3 last:border-0">
            <div className="w-1/3 font-semibold text-slate-700">{label}</div>
            <div className="w-2/3 text-slate-600">{value || "—"}</div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div>
            <h3 className="mb-3 font-bold text-slate-800">{title}</h3>
            <div className="space-y-2 rounded-lg border border-slate-200 p-4">{children}</div>
        </div>
    );
}

export default function RentalBookingDetailModal({ open, rentalId, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !rentalId) {
            setDetail(null);
            return;
        }

        async function load() {
            setLoading(true);
            setError("");
            try {
                const data = await getRentalBookingDetail(rentalId);
                setDetail(data);
            } catch (err) {
                setError(err?.response?.data?.message || "Không thể tải thông tin chi tiết.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [open, rentalId]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Chi tiết đơn thuê xe</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-2xl leading-none opacity-50 hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 mb-4">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-10 text-center text-slate-400">Đang tải...</div>
                    ) : detail ? (
                        <div className="space-y-6">
                            {/* Thông tin đơn */}
                            <Section title="📋 Thông Tin Đơn Thuê">
                                <InfoRow label="Mã đơn" value={detail.rental_code || `#${detail.rental_id}`} />
                                <InfoRow label="Loại dịch vụ" value={SERVICE_TYPE_LABEL[detail.service_type] || `Type ${detail.service_type}`} />
                                <InfoRow label="Gói thuê" value={detail.package_name} />
                                <InfoRow label="Trạng thái" value={STATUS_LABEL[detail.status] || detail.status} />
                                <InfoRow label="Thanh toán" value={PAYMENT_STATUS_LABEL[detail.payment_status] || detail.payment_status} />
                                <InfoRow label="Hình thức TT" value={PAYMENT_TYPE_LABEL[detail.payment_type] || (detail.payment_type ? `Type ${detail.payment_type}` : null)} />
                                <InfoRow label="Thời gian bắt đầu" value={formatDatetime(detail.start_datetime)} />
                                <InfoRow label="Thời gian kết thúc" value={formatDatetime(detail.end_datetime)} />
                                {detail.actual_end_datetime && (
                                    <InfoRow label="Kết thúc thực tế" value={formatDatetime(detail.actual_end_datetime)} />
                                )}
                                {detail.cancel_reason && (
                                    <InfoRow label="Lý do hủy" value={detail.cancel_reason} />
                                )}
                                <InfoRow label="Ngày tạo" value={formatDatetime(detail.created_at)} />
                            </Section>

                            {/* Địa điểm */}
                            <Section title="📍 Địa Điểm">
                                <InfoRow label="Điểm đón" value={detail.pickup_address} />
                                <InfoRow label="Điểm trả" value={detail.dropoff_address} />
                            </Section>

                            {/* Chi phí */}
                            <Section title="💰 Chi Phí">
                                <InfoRow label="Giá gói" value={formatCurrency(detail.base_price)} />
                                <InfoRow label="Tiền cọc" value={formatCurrency(detail.deposit_amount)} />
                                {detail.extra_time_fee > 0 && (
                                    <InfoRow label="Phí vượt giờ" value={formatCurrency(detail.extra_time_fee)} />
                                )}
                                {detail.extra_distance_fee > 0 && (
                                    <InfoRow label="Phí vượt km" value={formatCurrency(detail.extra_distance_fee)} />
                                )}
                                <InfoRow label="Tổng cộng" value={formatCurrency(detail.total_price)} />
                            </Section>

                            {/* Thông tin khách hàng */}
                            <Section title="👤 Thông Tin Khách Hàng">
                                <InfoRow label="Tên" value={detail.user_name} />
                                <InfoRow label="Điện thoại" value={detail.user_phone} />
                                <InfoRow label="Email" value={detail.user_email} />
                                <InfoRow label="Địa chỉ" value={detail.user_address} />
                            </Section>

                            {/* Thông tin chủ xe */}
                            <Section title="🏢 Thông Tin Chủ Xe">
                                <InfoRow label="Tên" value={detail.owner_name} />
                                <InfoRow label="Điện thoại" value={detail.owner_phone} />
                                <InfoRow label="Email" value={detail.owner_email} />
                                <InfoRow label="Địa chỉ" value={detail.owner_address} />
                            </Section>

                            {/* Thông tin xe */}
                            <Section title="🔧 Thông Tin Xe">
                                <InfoRow label="Biển số" value={detail.license_plate} />
                                <InfoRow label="Hãng" value={detail.vehicle_brand} />
                                <InfoRow label="Dòng xe" value={detail.vehicle_model} />
                                <InfoRow label="Năm sản xuất" value={detail.vehicle_year} />
                                <InfoRow label="Màu sắc" value={detail.vehicle_color} />
                            </Section>

                            {/* Thông tin tài xế (nếu có) */}
                            {detail.driver_name && (
                                <Section title="👨‍💼 Thông Tin Tài Xế">
                                    <InfoRow label="Tên" value={detail.driver_name} />
                                    <InfoRow label="Điện thoại" value={detail.driver_phone} />
                                </Section>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-900"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
