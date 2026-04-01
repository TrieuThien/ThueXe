export const BOOKING_STATUS_OPTIONS = [
    { value: 0, label: "Chờ xử lý" },
    { value: 1, label: "Đang chở khách" },
    { value: 2, label: "Khách hủy" },
    { value: 3, label: "Hoàn thành" },
    { value: 4, label: "Tài xế hủy" },
    { value: 5, label: "Hệ thống/Admin hủy" },
    { value: 6, label: "Đã đến điểm đón" },
];

export const PAYMENT_TYPE_OPTIONS = [
    { value: 1, label: "Tiền mặt" },
    { value: 2, label: "Ví" },
    { value: 3, label: "Thẻ" },
    { value: 4, label: "POS" },
];

export const BOOKING_TYPE_OPTIONS = [
    { value: 0, label: "Nội thành" },
    { value: 1, label: "Liên tỉnh" },
];

export const BOOKING_STATUS_BADGE = {
    0: "bg-amber-100 text-amber-800",
    1: "bg-blue-100 text-blue-800",
    2: "bg-rose-100 text-rose-700",
    3: "bg-emerald-100 text-emerald-700",
    4: "bg-rose-100 text-rose-700",
    5: "bg-slate-200 text-slate-700",
    6: "bg-cyan-100 text-cyan-700",
};

export function getStatusLabel(status) {
    const option = BOOKING_STATUS_OPTIONS.find((item) => item.value === Number(status));
    return option?.label || `Trạng thái ${status}`;
}
