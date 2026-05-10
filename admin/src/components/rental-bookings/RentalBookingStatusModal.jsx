import { useState } from "react";
import { updateRentalBookingStatus } from "../../services/rentalBookingService";

const STATUS_OPTIONS = [
    { value: "scheduled", label: "Đã lên lịch" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "in_progress", label: "Đang thực hiện" },
    { value: "completed", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã hủy" },
];

export default function RentalBookingStatusModal({ open, booking, onClose, onSuccess }) {
    const [selectedStatus, setSelectedStatus] = useState(booking?.status || "");
    const [cancelReason, setCancelReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!open || !booking) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleConfirm = async () => {
        if (!selectedStatus) return;
        setLoading(true);
        setError("");
        try {
            await updateRentalBookingStatus(booking.rental_id, {
                status: selectedStatus,
                cancel_reason: selectedStatus === "cancelled" ? cancelReason || undefined : undefined,
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Không thể cập nhật trạng thái.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onClick={handleOverlayClick}
        >
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
                <h2 className="text-base font-bold text-slate-800">
                    Cập nhật trạng thái — #{booking.rental_code || booking.rental_id}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                    Trạng thái hiện tại:{" "}
                    <span className="font-semibold">
                        {STATUS_OPTIONS.find((o) => o.value === booking.status)?.label || booking.status}
                    </span>
                </p>

                <div className="mt-4 space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Trạng thái mới
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setError("");
                            }}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
                        >
                            <option value="" disabled>Chọn trạng thái...</option>
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {selectedStatus === "cancelled" && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                                Lý do hủy (không bắt buộc)
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                rows={3}
                                placeholder="Nhập lý do hủy đơn..."
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none resize-none"
                            />
                        </div>
                    )}

                    {error && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            {error}
                        </p>
                    )}
                </div>

                <div className="mt-5 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || !selectedStatus}
                        className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Đang lưu..." : "Xác nhận"}
                    </button>
                </div>
            </div>
        </div>
    );
}
