import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, FileText, Loader2, PencilLine } from "lucide-react";
import { reviewPayout } from "../../services/adminService";
import { getVehicleOwnerDetail } from "../../services/vehicleOwnerService";
import { buildRolePath } from "../../config/roleRoutes";
import { buildVehicleOwnerEditPath } from "./vehicleOwnerNavigation";
import { formatVehicleOwnerAccountStatus, formatVehicleOwnerActivationStatus, formatVehicleOwnerVerificationStatus } from "./vehicleOwnerFormUtils";

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
    return new Intl.DateTimeFormat("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function InfoItem({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{value || "--"}</p>
        </div>
    );
}

export default function VehicleOwnerDetail() {
    const { ownerId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [tab, setTab] = useState("vehicles");
    const [actionMessage, setActionMessage] = useState({ type: "", text: "" });
    const [documentPreview, setDocumentPreview] = useState(null);

    async function loadDetail() {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await getVehicleOwnerDetail(ownerId);
            setDetail(data);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không tải được chi tiết chủ xe.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDetail();
    }, [ownerId]);

    async function handleWithdrawalAction(withdrawal, decision) {
        try {
            await reviewPayout(withdrawal.withdrawal_id, {
                status: decision === "approve" ? "approved" : "rejected",
                note: `Reviewed from vehicle-owner detail: ${decision}`,
            });
            await loadDetail();
            setActionMessage({
                type: "success",
                text: decision === "approve" ? "Đã duyệt yêu cầu rút tiền." : "Đã từ chối yêu cầu rút tiền.",
            });
        } catch (error) {
            setActionMessage({ type: "error", text: error?.response?.data?.message || "Không thể xử lý yêu cầu rút tiền." });
        }
    }

    const owner = detail?.owner;
    const accountStatus = formatVehicleOwnerAccountStatus(owner?.account_active);
    const activationStatus = formatVehicleOwnerActivationStatus(owner?.is_activated);
    const verificationStatus = formatVehicleOwnerVerificationStatus(owner?.verification_status);
    const tabs = [
        { key: "vehicles", label: "Phương tiện" },
        { key: "rentals", label: "Cho thuê" },
        { key: "withdrawals", label: "Rút tiền" },
        { key: "walletLedger", label: "Ví" },
        { key: "documents", label: "Hồ sơ" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-6 text-white lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Chi tiết chủ xe </p>
                    <h1 className="mt-2 text-3xl font-bold">{owner?.fullname || `Chủ xe #${ownerId}`}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Xem hồ sơ chủ xe, thống kê, phương tiện, booking, ví và hồ sơ xác minh trên cùng một màn hình.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link to={buildRolePath(role, "vehicle-owners")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"><ArrowLeft className="h-4 w-4" />Quay lại danh sách</Link>
                    {owner ? <Link to={buildVehicleOwnerEditPath(role, owner.owner_id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"><PencilLine className="h-4 w-4" />Sửa thông tin</Link> : null}
                </div>
            </div>

            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div></div> : null}
            {actionMessage.text ? <div className={`rounded-2xl px-4 py-3 text-sm ${actionMessage.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}><div className="flex items-start gap-2">{actionMessage.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{actionMessage.text}</span></div></div> : null}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm"><div className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Đang tải chi tiết chủ xe...</div></div>
            ) : owner ? (
                <>
                    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <InfoItem label="Owner ID" value={`#${owner.owner_id}`} />
                            <InfoItem label="Số điện thoại" value={owner.phone} />
                            <InfoItem label="Email" value={owner.email} />
                            <InfoItem label="Địa chỉ" value={owner.address} />
                            <InfoItem label="Ngân hàng" value={owner.bank_name} />
                            <InfoItem label="Số tài khoản" value={owner.bank_account} />
                            <InfoItem label="Hoa hồng" value={`${Number(owner.commission_rate || 0)}%`} />
                            <InfoItem label="Số dư ví" value={formatMoney(owner.wallet_balance)} />
                            <InfoItem label="Ngày tạo" value={formatDateTime(owner.date_created)} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verificationStatus.className}`}>{verificationStatus.label}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accountStatus.className}`}>{accountStatus.label}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activationStatus.className}`}>{activationStatus.label}</span>
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        <InfoItem label="Tổng phương tiện" value={detail?.stats?.total_vehicles} />
                        <InfoItem label="Tổng booking" value={detail?.stats?.total_rentals} />
                        <InfoItem label="Tổng doanh thu" value={formatMoney(detail?.stats?.total_revenue)} />
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-4">
                            {tabs.map((item) => (
                                <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${tab === item.key ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="overflow-x-auto">
                            {tab === "vehicles" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">ID</th><th className="px-6 py-4">Xe</th><th className="px-6 py-4">Biển số</th><th className="px-6 py-4">Trạng thái xác minh</th><th className="px-6 py-4">Xác minh</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.vehicles || []).map((item) => <tr key={item.vehicle_id} className="text-sm text-slate-700"><td className="px-6 py-4">#{item.vehicle_id}</td><td className="px-6 py-4">{`${item.brand || ""} ${item.model || ""} ${item.year || ""}`.trim()}</td><td className="px-6 py-4">{item.license_plate || "--"}</td><td className="px-6 py-4">{item.status || "--"}</td><td className="px-6 py-4">{item.verification_status || "--"}</td></tr>)}</tbody>
                                </table>
                            ) : null}
                            {tab === "rentals" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">Cho thuê</th><th className="px-6 py-4">Khách hàng</th><th className="px-6 py-4">Bắt đầu</th><th className="px-6 py-4">Kết thúc</th><th className="px-6 py-4">Tổng tiền</th><th className="px-6 py-4">Thanh toán</th><th className="px-6 py-4">Trạng thái</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.rentals || []).map((item) => <tr key={item.rental_id} className="text-sm text-slate-700"><td className="px-6 py-4">{item.rental_code || `#${item.rental_id}`}</td><td className="px-6 py-4">{item.customer_name || "--"}</td><td className="px-6 py-4">{formatDateTime(item.start_datetime)}</td><td className="px-6 py-4">{formatDateTime(item.end_datetime)}</td><td className="px-6 py-4">{formatMoney(item.total_price)}</td><td className="px-6 py-4">{item.payment_status || "--"}</td><td className="px-6 py-4">{item.status || "--"}</td></tr>)}</tbody>
                                </table>
                            ) : null}
                            {tab === "withdrawals" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">ID rút tiền</th><th className="px-6 py-4">Số tiền</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Yêu cầu</th><th className="px-6 py-4">Xử lý</th><th className="px-6 py-4">Hành động</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.withdrawals || []).map((item) => <tr key={item.withdrawal_id} className="text-sm text-slate-700"><td className="px-6 py-4">#{item.withdrawal_id}</td><td className="px-6 py-4">{formatMoney(item.amount)}</td><td className="px-6 py-4">{item.status || "--"}</td><td className="px-6 py-4">{formatDateTime(item.requested_at)}</td><td className="px-6 py-4">{formatDateTime(item.processed_at)}</td><td className="px-6 py-4"><div className="flex gap-2">{String(item.status || "").toLowerCase() === "pending" ? <><button type="button" onClick={() => handleWithdrawalAction(item, "approve")} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">Approve</button><button type="button" onClick={() => handleWithdrawalAction(item, "reject")} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Reject</button></> : <span className="text-xs text-slate-400">Đã xử lý</span>}</div></td></tr>)}</tbody>
                                </table>
                            ) : null}
                            {tab === "walletLedger" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">ID</th><th className="px-6 py-4">Hình thức</th><th className="px-6 py-4">Loại giao dịch</th><th className="px-6 py-4">Số tiền</th><th className="px-6 py-4">Số dư sau</th><th className="px-6 py-4">Ngày tạo</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.walletLedger || []).map((item) => <tr key={item.ledger_id} className="text-sm text-slate-700"><td className="px-6 py-4">#{item.ledger_id}</td><td className="px-6 py-4">{item.direction || "--"}</td><td className="px-6 py-4">{item.entry_type || "--"}</td><td className="px-6 py-4">{formatMoney(item.amount)}</td><td className="px-6 py-4">{formatMoney(item.balance_after)}</td><td className="px-6 py-4">{formatDateTime(item.created_at)}</td></tr>)}</tbody>
                                </table>
                            ) : null}
                            {tab === "documents" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">Hồ sơ</th><th className="px-6 py-4">Số giấy tờ</th><th className="px-6 py-4">Hạn sử dụng</th><th className="px-6 py-4">Trạng thái xác minh</th><th className="px-6 py-4">Cập nhật</th><th className="px-6 py-4">Hành động</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.documents || []).map((item) => <tr key={item.id} className="text-sm text-slate-700"><td className="px-6 py-4">{item.document_title || "--"}</td><td className="px-6 py-4">{item.doc_number || "--"}</td><td className="px-6 py-4">{formatDateTime(item.doc_expiry_date)}</td><td className="px-6 py-4">{item.status || "--"}</td><td className="px-6 py-4">{formatDateTime(item.updated_at)}</td><td className="px-6 py-4">{item.file_url ? <button type="button" onClick={() => setDocumentPreview(item)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Eye className="h-4 w-4" />Xem ảnh</button> : "--"}</td></tr>)}</tbody>
                                </table>
                            ) : null}
                        </div>
                    </section>
                </>
            ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><FileText className="h-6 w-6" /></div>
                    <p className="mt-4 text-sm text-slate-500">Không tìm thấy chủ xe này.</p>
                </div>
            )}

            {documentPreview ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setDocumentPreview(null)}>
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-900">{documentPreview.document_title || "Ho so"}</h3>
                        <p className="mt-1 text-sm text-slate-500">Số giấy tờ: {documentPreview.doc_number || "--"}</p>
                        <div className="mt-4">
                            {documentPreview.mime_type && documentPreview.mime_type.startsWith("image/") ? (
                                <img src={documentPreview.file_url} alt={documentPreview.document_title || "Ho so"} className="max-h-[70vh] w-full rounded-2xl border border-slate-200 object-contain" />
                            ) : documentPreview.mime_type === "application/pdf" ? (
                                <div className="overflow-hidden rounded-2xl border border-slate-200">
                                    <iframe src={documentPreview.file_url} title={documentPreview.document_title || "PDF"} className="h-[70vh] w-full" />
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    Định dạng tệp này không hỗ trợ xem trước. <a href={documentPreview.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Tải xuống</a>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => setDocumentPreview(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Đóng</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}





