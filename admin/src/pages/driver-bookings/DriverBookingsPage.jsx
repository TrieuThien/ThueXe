/**
 * DriverBookingsPage.jsx
 *
 * Admin quản lý đơn thuê tài xế.
 * Route: /admin/driver-bookings
 *
 * Tabs:
 *  - Đang tìm tài xế (scheduled)
 *  - Đã nhận (pending / in_progress)
 *  - Hoàn thành (completed)
 *  - Đã hủy (cancelled)
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    listDriverBookings,
    updateDriverBookingStatus,
} from "../../services/driverBookingService";

const TABS = [
    { key: "scheduled",   label: "Đang tìm tài xế" },
    { key: "pending",     label: "Đã nhận / Chờ bắt đầu" },
    { key: "in_progress", label: "Đang chạy" },
    { key: "completed",   label: "Hoàn thành" },
    { key: "cancelled",   label: "Đã hủy" },
];

const STATUS_COLORS = {
    scheduled:   "bg-blue-100 text-blue-700",
    pending:     "bg-yellow-100 text-yellow-700",
    in_progress: "bg-green-100 text-green-700",
    completed:   "bg-gray-100 text-gray-600",
    cancelled:   "bg-red-100 text-red-600",
};

const STATUS_LABELS = {
    scheduled:   "Đang tìm tài xế",
    pending:     "Chờ bắt đầu",
    in_progress: "Đang chạy",
    completed:   "Hoàn thành",
    cancelled:   "Đã hủy",
};

export default function DriverBookingsPage() {
    const [activeTab, setActiveTab] = useState("scheduled");
    const [page, setPage] = useState(1);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["driver-bookings", activeTab, page],
        queryFn: () => listDriverBookings({ status: activeTab, page, limit: 20 }),
        refetchInterval: activeTab === "scheduled" ? 5000 : false, // Auto-refresh khi đang tìm
    });

    const items = data?.items ?? [];
    const pagination = data?.pagination ?? {};

    const handleTabChange = (key) => {
        setActiveTab(key);
        setPage(1);
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Đơn thuê tài xế</h1>
                <button
                    onClick={refetch}
                    className="px-4 py-2 text-sm bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 transition"
                >
                    ↻ Làm mới
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                            activeTab === tab.key
                                ? "bg-white border border-b-white border-gray-200 text-amber-700 -mb-px"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    Không có đơn nào.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {["Mã đặt", "Khách hàng", "Tài xế", "Gói", "Bắt đầu", "Trạng thái", "Tổng tiền", ""].map(
                                    (h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                                        >
                                            {h}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {items.map((booking) => (
                                <BookingRow
                                    key={booking.rental_id}
                                    booking={booking}
                                    onRefetch={refetch}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {pagination.total_pages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-sm"
                    >
                        ← Trước
                    </button>
                    <span className="px-4 py-1 text-sm text-gray-600">
                        Trang {page} / {pagination.total_pages}
                    </span>
                    <button
                        disabled={page >= pagination.total_pages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-sm"
                    >
                        Tiếp →
                    </button>
                </div>
            )}
        </div>
    );
}

function BookingRow({ booking, onRefetch }) {
    const [updating, setUpdating] = useState(false);

    const handleStatusChange = async (newStatus) => {
        setUpdating(true);
        try {
            await updateDriverBookingStatus(booking.rental_id, newStatus);
            onRefetch();
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi cập nhật trạng thái");
        } finally {
            setUpdating(false);
        }
    };

    const fmtCurrency = (n) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);

    const fmtDate = (d) => {
        try {
            return new Date(d).toLocaleString("vi-VN", {
                day: "2-digit", month: "2-digit",
                hour: "2-digit", minute: "2-digit",
            });
        } catch { return d; }
    };

    const statusCls = STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-600";

    return (
        <tr className="hover:bg-amber-50 transition">
            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                #{booking.rental_id}
            </td>
            <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{booking.user_name ?? "—"}</div>
                <div className="text-xs text-gray-400">{booking.user_phone ?? ""}</div>
            </td>
            <td className="px-4 py-3">
                {booking.driver_id ? (
                    <span className="text-green-700 font-medium">ID {booking.driver_id}</span>
                ) : (
                    <span className="text-gray-400 italic">Chưa gán</span>
                )}
            </td>
            <td className="px-4 py-3 text-gray-700">{booking.package_name ?? "—"}</td>
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(booking.start_datetime)}</td>
            <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusCls}`}>
                    {STATUS_LABELS[booking.status] ?? booking.status}
                </span>
            </td>
            <td className="px-4 py-3 font-semibold text-amber-700">
                {fmtCurrency(booking.total_price)}
            </td>
            <td className="px-4 py-3">
                {booking.status === "scheduled" && (
                    <button
                        onClick={() => handleStatusChange("cancelled")}
                        disabled={updating}
                        className="text-xs text-red-600 hover:underline disabled:opacity-40"
                    >
                        {updating ? "..." : "Hủy đơn"}
                    </button>
                )}
            </td>
        </tr>
    );
}
