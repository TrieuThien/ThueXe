import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2, PencilLine, RefreshCw, ShieldUser, Star } from "lucide-react";
import { getStaffDetail } from "../../services/staffService";
import { buildStaffEditPath } from "./staffNavigation";

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

function formatMoney(amount, currencyCode = "VND") {
    const numericAmount = Number(amount || 0);

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(numericAmount);
}

function InfoItem({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{value || "--"}</p>
        </div>
    );
}

export default function StaffDetail() {
    const { userId } = useParams();
    const outletContext = useOutletContext();
    const role = outletContext?.role || "admin";
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [tab, setTab] = useState("transactions");

    async function loadDetail() {
        setLoading(true);
        setErrorMessage("");

        try {
            const data = await getStaffDetail(userId);
            setDetail(data);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không tải được nhân viên.");
            setDetail(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDetail();
    }, [userId]);

    const staff = detail?.staff;
    const tabs = [
        { key: "transactions", label: "Giao dịch" },
        { key: "reviews", label: "Đánh giá" },
        { key: "documents", label: "Hồ sơ" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-6 py-6 text-white lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Staff detail</p>
                    <h1 className="mt-2 text-3xl font-bold">{staff?.full_name || `Nhan vien #${userId}`}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-200">Thông tin chi tiết tài khoản nhân viên.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link to="/admin/staff" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                        <ArrowLeft className="h-4 w-4" />Quay lại
                    </Link>
                    {staff ? <Link to={buildStaffEditPath(role, staff.user_id)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"><PencilLine className="h-4 w-4" />Chỉnh sửa thông tin nhân viên</Link> : null}
                    <button type="button" onClick={loadDetail} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                        <RefreshCw className="h-4 w-4" />Tải lại
                    </button>
                </div>
            </div>

            {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span></div></div>
            ) : null}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-10 shadow-sm"><div className="flex items-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /><span>Đang tải chi tiết nhân viên</span></div></div>
            ) : staff ? (
                <>
                    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                        <div className="flex flex-col gap-6 lg:flex-row">
                            <div className="flex w-full max-w-sm flex-col items-center rounded-[24px] bg-white p-5 text-center shadow-sm">
                                {staff.photo_file ? <img src={staff.photo_file} alt={staff.full_name} className="h-28 w-28 rounded-[28px] object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-slate-200 text-3xl font-bold text-slate-600">{staff.firstname?.[0] || "S"}</div>}
                                <h2 className="mt-4 text-xl font-bold text-slate-900">{staff.full_name}</h2>
                                <p className="mt-1 text-sm text-slate-500">User #{staff.user_id}</p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{staff.role}</span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(staff.account_active) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                        {Number(staff.account_active) === 1 ? "Đang hoạt động" : "Đang khóa"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h2>
                                    <p className="mt-1 text-sm text-slate-500">Dữ liệu hồ sơ cơ bản của nhân viên.</p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <InfoItem label="Email" value={staff.email} />
                                    <InfoItem label="Số điện thoại" value={staff.phone} />
                                    <InfoItem label="Địa chỉ" value={staff.address} />
                                    <InfoItem label="Quốc gia" value={staff.country} />
                                    <InfoItem label="Mã quốc gia" value={staff.country_code} />
                                    <InfoItem label="Mã vùng điện thoại" value={staff.country_dial_code} />
                                    <InfoItem label="Thành phố" value={staff.route_name} />
                                    <InfoItem label="Số dư ví" value={formatMoney(staff.wallet_amount)} />
                                    <InfoItem label="Đánh giá" value={`${staff.user_rating || 0}/5`} />
                                    <InfoItem label="Ngày tạo" value={formatDateTime(staff.account_create_date)} />
                                    <InfoItem label="Lần đăng nhập cuối" value={formatDateTime(staff.last_login_date)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-4">
                            {tabs.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setTab(item.key)}
                                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${tab === item.key
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
                                            <th className="px-6 py-4">STT</th>
                                            <th className="px-6 py-4">Mã giao dịch</th>
                                            <th className="px-6 py-4">Số tiền</th>
                                            <th className="px-6 py-4">Số dư ví</th>
                                            <th className="px-6 py-4">Mã đặt chỗ</th>
                                            <th className="px-6 py-4">Loại</th>
                                            <th className="px-6 py-4">Mô tả</th>
                                            <th className="px-6 py-4">Ngày tạo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(detail?.transactions || []).map((item, index) => (
                                            <tr key={item.id} className="text-sm text-slate-700">
                                                <td className="px-6 py-4">{index + 1}</td>
                                                <td className="px-6 py-4">{item.transaction_id || "--"}</td>
                                                <td className="px-6 py-4">{formatMoney(item.amount)}</td>
                                                <td className="px-6 py-4">{formatMoney(item.wallet_balance)}</td>
                                                <td className="px-6 py-4">{item.booking_id || "--"}</td>
                                                <td className="px-6 py-4">{item.type_label || item.type}</td>
                                                <td className="px-6 py-4">{item.description || "--"}</td>
                                                <td className="px-6 py-4">{formatDateTime(item.transaction_date)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : null}

                            {tab === "reviews" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">STT</th><th className="px-6 py-4">Tên người đánh giá</th><th className="px-6 py-4">Mã đặt chỗ</th><th className="px-6 py-4">Đánh giá</th><th className="px-6 py-4">Bình luận</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.reviews || []).map((item, index) => <tr key={item.id} className="text-sm text-slate-700"><td className="px-6 py-4">{index + 1}</td><td className="px-6 py-4">{item.reviewer_name || "--"}</td><td className="px-6 py-4">{item.booking_id || "--"}</td><td className="px-6 py-4"><div className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />{item.rating}</div></td><td className="px-6 py-4">{item.comment || "--"}</td></tr>)}</tbody>
                                </table>
                            ) : null}

                            {tab === "documents" ? (
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500"><th className="px-6 py-4">STT</th><th className="px-6 py-4">Tên hồ sơ</th><th className="px-6 py-4">Mã định danh</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Ngày hết hạn</th><th className="px-6 py-4">Ngày cập nhật</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">{(detail?.documents || []).map((item, index) => <tr key={item.id} className="text-sm text-slate-700"><td className="px-6 py-4">{index + 1}</td><td className="px-6 py=4"><div className="font-semibold text-slate-900">{item.title || "--"}</div></td><td className="px-6 py-4">{item.id_number ? `${item.id_number_title || "Mã"}: ${item.id_number}` : "--"}</td><td className="px-6 py-4">{item.status_label || item.status}</td><td className="px-6 py-4">{formatDateTime(item.expiry_date)}</td><td className="px-6 py=4">{formatDateTime(item.date_updated)}</td></tr>)}</tbody>
                                </table>
                            ) : null}
                        </div>
                    </section>
                </>
            ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ShieldUser className="h-6 w-6" /></div>
                    <p className="mt-4 text-sm text-slate-500">Không tìm thấy nhân viên này.</p>
                </div>
            )}
        </div>
    );
}
