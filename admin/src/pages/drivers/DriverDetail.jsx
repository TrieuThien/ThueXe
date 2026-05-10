import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowLeft,
    CreditCard,
    FileText,
    Loader2,
    MapPinned,
    PencilLine,
    Star,
    Truck,
} from "lucide-react";
import { getDriverDetail, getDriverLocation, updateDriverWithdrawal } from "../../services/driverService";
import { buildRolePath } from "../../config/roleRoutes";
import {
    buildDriverBookingHistoryDestination,
    buildDriverEditPath,
} from "./driverNavigation";
import {
    formatDriverAccountStatus,
    formatDriverActivationStatus,
    formatDriverAvailability,
} from "./driverFormUtils";

function formatMoney(amount, currencyCode = "VND") {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}

function formatDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function InfoItem({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{value || "--"}</p>
        </div>
    );
}

export default function DriverDetail() {
    const { driverId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [tab, setTab] = useState("transactions");
    const [tracking, setTracking] = useState({ loading: false, data: null, error: "" });

    async function loadDetail(successMessage = "") {
        setLoading(true);
        setErrorMessage(successMessage ? "" : errorMessage);
        try {
            const data = await getDriverDetail(driverId);
            setDetail(data);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không tải được chi tiết tài xế.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDetail();
    }, [driverId]);

    async function handleTrack() {
        setTracking({ loading: true, data: null, error: "" });
        try {
            const data = await getDriverLocation(driverId);
            setTracking({ loading: false, data: data.location || null, error: "" });
        } catch (error) {
            setTracking({
                loading: false,
                data: null,
                error: error?.response?.data?.message || "Không tải được vị trí tài xế.",
            });
        }
    }

    async function handleWithdrawalAction(withdrawalId, action) {
        try {
            await updateDriverWithdrawal(driverId, withdrawalId, { action });
            await loadDetail();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể xử lý yêu cầu rút tiền.");
        }
    }

    const driver = detail?.driver;
    const accountStatus = formatDriverAccountStatus(driver?.account_active);
    const activationStatus = formatDriverActivationStatus(driver?.is_activated);
    const availabilityStatus = formatDriverAvailability(driver?.available);
    const tabs = [
        { key: "transactions", label: "Giao dịch" },
        { key: "bookings", label: "Lịch sử chuyến đi" },
        { key: "withdrawals", label: "Yêu cầu rút tiền" },
        { key: "reviews", label: "Đánh giá" },
        { key: "documents", label: "Hồ sơ" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-6 text-white lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Driver detail</p>
                    <h1 className="mt-2 text-3xl font-bold">{driver?.full_name || `Tài xế #${driverId}`}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Xem hồ sơ tài xế, thống kê, giao dịch ví, yêu cầu rút tiền, đánh giá và tài liệu trên cùng một màn hình.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link to={buildRolePath(role, "drivers")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"><ArrowLeft className="h-4 w-4" />Quay lại danh sách</Link>
                    {driver ? <Link to={buildDriverEditPath(role, driver.driver_id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"><PencilLine className="h-4 w-4" />Sửa thông tin</Link> : null}
                    {driver ? <Link to={buildDriverBookingHistoryDestination(role, driver)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"><Truck className="h-4 w-4" />Lịch sử chuyến</Link> : null}
                    <button type="button" onClick={handleTrack} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"><MapPinned className="h-4 w-4" />Theo dõi vị trí</button>
                </div>
            </div>

            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div></div> : null}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Đang tải chi tiết tài xế...</div>
                </div>
            ) : driver ? (
                <>
                    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <div className="flex flex-col gap-6 lg:flex-row">
                            <div className="flex w-full max-w-sm flex-col items-center rounded-[24px] bg-white p-5 text-center shadow-sm">
                                {driver.photo_file ? <img src={driver.photo_file} alt={driver.full_name} className="h-28 w-28 rounded-[28px] object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-slate-200 text-3xl font-bold text-slate-600">{driver.firstname?.[0] || "D"}</div>}
                                <h2 className="mt-4 text-xl font-bold text-slate-900">{driver.full_name}</h2>
                                <p className="mt-1 text-sm text-slate-500">Driver #{driver.driver_id}</p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accountStatus.className}`}>{accountStatus.label}</span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activationStatus.className}`}>{activationStatus.label}</span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${availabilityStatus.className}`}>{availabilityStatus.label}</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <InfoItem label="Email" value={driver.email} />
                                    <InfoItem label="Số điện thoại" value={driver.phone} />
                                    <InfoItem label="Địa chỉ" value={driver.drv_address} />
                                    <InfoItem label="Thành phố" value={driver.route_name} />
                                    <InfoItem label="Loại xe" value={driver.ride_type} />
                                    <InfoItem label="Hoa hồng" value={`${driver.driver_commision ?? 0}%`} />
                                    <InfoItem label="Biển số" value={driver.car_plate_num} />
                                    <InfoItem label="Dòng xe" value={driver.car_model} />
                                    <InfoItem label="Năm xe / màu xe" value={`${driver.car_year || "--"} / ${driver.car_color || "--"}`} />
                                    <InfoItem label="Ngân hàng" value={driver.bank_name} />
                                    <InfoItem label="Chủ tài khoản" value={driver.bank_acc_holder_name} />
                                    <InfoItem label="Số tài khoản" value={driver.bank_acc_num} />
                                    <InfoItem label="Ví" value={formatMoney(driver.wallet_amount)} />
                                    <InfoItem label="Ngày tạo" value={formatDateTime(driver.account_create_date)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        <InfoItem label="Completed rides" value={detail?.stats?.completed_rides} />
                        <InfoItem label="Cancelled rides" value={detail?.stats?.cancelled_rides} />
                        <InfoItem label="Rejected rides" value={detail?.stats?.rejected_rides} />
                    </section>

                    {tracking.loading || tracking.data || tracking.error ? (
                        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <MapPinned className="h-5 w-5 text-sky-600" />
                                <h2 className="text-lg font-bold text-slate-900">Theo dõi vị trí</h2>
                            </div>
                            <div className="mt-4 text-sm text-slate-600">
                                {tracking.loading ? "Đang tải vị trí..." : null}
                                {tracking.error ? tracking.error : null}
                                {tracking.data ? (
                                    <div className="space-y-2">
                                        <p>Latitude: <span className="font-semibold text-slate-900">{tracking.data.lat}</span></p>
                                        <p>Longitude: <span className="font-semibold text-slate-900">{tracking.data.long}</span></p>
                                        <p>Thời gian cập nhật: <span className="font-semibold text-slate-900">{formatDateTime(tracking.data.location_date)}</span></p>
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-4">
                            {tabs.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setTab(item.key)}
                                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                                        tab === item.key
                                            ? "bg-slate-900 text-white"
                                            : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-x-auto">
                            {tab === "transactions" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                            <th className="px-6 py-4">STT</th><th className="px-6 py-4">ID Giao dịch</th><th className="px-6 py-4">Số tiền</th><th className="px-6 py-4">Số dư ví</th><th className="px-6 py-4">ID đơn</th><th className="px-6 py-4">Loại</th><th className="px-6 py-4">Ghi chú</th><th className="px-6 py-4">Ngày tạo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.transactions || []).map((item, index) => <tr key={item.id} className="text-sm text-slate-700"><td className="px-6 py-4">{index + 1}</td><td className="px-6 py-4">{item.transaction_id || item.reference || "--"}</td><td className="px-6 py-4">{formatMoney(item.amount)}</td><td className="px-6 py-4">{formatMoney(item.wallet_balance)}</td><td className="px-6 py-4">{item.booking_id || "--"}</td><td className="px-6 py-4">{item.type_label || item.type}</td><td className="px-6 py-4">{item.description || "--"}</td><td className="px-6 py-4">{formatDateTime(item.transaction_date)}</td></tr>)}</tbody>
                                </table>
                            ) : null}

                            {tab === "bookings" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">STT</th><th className="px-6 py-4">ID đơn</th><th className="px-6 py-4">Khách hàng</th><th className="px-6 py-4">Điểm đón</th><th className="px-6 py-4">Điểm trả</th><th className="px-6 py-4">Thời gian chuyến đi</th><th className="px-6 py-4">Phí ước tính</th><th className="px-6 py-4">Số tiền</th><th className="px-6 py-4">Thanh toán</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Hành động</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.bookings || []).map((item, index) => <tr key={item.booking_id} className="text-sm text-slate-700"><td className="px-6 py-4">{index + 1}</td><td className="px-6 py-4">{item.booking_id}</td><td className="px-6 py-4">{item.customer_name || "--"}</td><td className="px-6 py-4">{item.pickup || "--"}</td><td className="px-6 py-4">{item.dropoff || "--"}</td><td className="px-6 py-4">{formatDateTime(item.time_booking)}</td><td className="px-6 py-4">{formatMoney(item.estimated_fare)}</td><td className="px-6 py-4">{formatMoney(item.amount_paid)}</td><td className="px-6 py-4">{item.payment_method_label || "--"}</td><td className="px-6 py-4">{item.status_label || item.status}</td><td className="px-6 py-4"><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-400">Chưa có route xem</button></td></tr>)}</tbody>
                                </table>
                            ) : null}

                            {tab === "withdrawals" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">STT</th><th className="px-6 py-4">Số tiền</th><th className="px-6 py-4">Số dư ban đầu</th><th className="px-6 py-4">Số dư sau</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Ngày yêu cầu</th><th className="px-6 py-4">Ngày xử lý</th><th className="px-6 py-4">Hành động</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.withdrawals || []).map((item, index) => <tr key={item.id} className="text-sm text-slate-700"><td className="px-6 py-4">{index + 1}</td><td className="px-6 py-4">{formatMoney(item.amount)}</td><td className="px-6 py-4">{formatMoney(item.wallet_amount_before)}</td><td className="px-6 py-4">{formatMoney(item.wallet_balance_after)}</td><td className="px-6 py-4">{item.status_label || item.status}</td><td className="px-6 py-4">{formatDateTime(item.date_requested)}</td><td className="px-6 py-4">{formatDateTime(item.date_settled)}</td><td className="px-6 py-4"><div className="flex gap-2">{Number(item.status) === 0 ? <><button type="button" onClick={() => handleWithdrawalAction(item.id, "approve")} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">Approve</button><button type="button" onClick={() => handleWithdrawalAction(item.id, "reject")} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Reject</button></> : <span className="text-xs text-slate-400">Đã xử lý</span>}</div></td></tr>)}</tbody>
                                </table>
                            ) : null}

                            {tab === "reviews" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">STT</th><th className="px-6 py-4">Người đánh giá</th><th className="px-6 py-4">Booking ID</th><th className="px-6 py-4">Rating</th><th className="px-6 py-4">Comment</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.reviews || []).map((item, index) => <tr key={item.id} className="text-sm text-slate-700"><td className="px-6 py-4">{index + 1}</td><td className="px-6 py-4">{item.reviewer_name || "--"}</td><td className="px-6 py-4">{item.booking_id || "--"}</td><td className="px-6 py-4"><div className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />{item.rating}</div></td><td className="px-6 py-4">{item.comment || "--"}</td></tr>)}</tbody>
                                </table>
                            ) : null}

                            {tab === "documents" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">STT</th><th className="px-6 py-4">Tên hồ sơ</th><th className="px-6 py-4">Mã định danh</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Ngày hết hạn</th><th className="px-6 py-4">Ngày cập nhật</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.documents || []).map((item, index) => <tr key={item.id} className="text-sm text-slate-700"><td className="px-6 py-4">{index + 1}</td><td className="px-6 py-4"><div className="font-semibold text-slate-900">{item.title || "--"}</div></td><td className="px-6 py-4">{item.id_number ? `${item.id_number_title || "Mã"}: ${item.id_number}` : "--"}</td><td className="px-6 py-4">{item.status_label || item.status}</td><td className="px-6 py-4">{formatDateTime(item.expiry_date)}</td><td className="px-6 py-4">{formatDateTime(item.date_updated)}</td></tr>)}</tbody>
                                </table>
                            ) : null}
                        </div>
                    </section>
                </>
            ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><FileText className="h-6 w-6" /></div>
                    <p className="mt-4 text-sm text-slate-500">Không tìm thấy tài xế này.</p>
                </div>
            )}
        </div>
    );
}
