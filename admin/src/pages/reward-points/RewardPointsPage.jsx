import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import {
    adjustRewardPoints,
    getRewardPointsConfig,
    getRewardPointsHistory,
    processBookingRewardPoints,
    redeemRewardPoints,
    updateRewardPointsConfig,
} from "../../services/rewardPointsService";

const ACTION_OPTIONS = [
    { value: "", label: "Tất cả hành động" },
    { value: "1", label: "Cộng điểm" },
    { value: "2", label: "Đổi điểm" },
    { value: "4", label: "Điều chỉnh tăng" },
    { value: "5", label: "Điều chỉnh giảm" },
];

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
        second: "2-digit",
    }).format(date);
}

function formatNumber(value, fractionDigits = 1) {
    const parsed = Number(value || 0);
    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(parsed);
}

function formatMoney(value) {
    const parsed = Number(value || 0);
    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(parsed);
}

export default function RewardPointsPage() {
    const [configForm, setConfigForm] = useState({
        status: 0,
        cur_to_points_conv: "",
        points_to_cur_conv: "",
        min_points_redeemable: "",
    });
    const [historyItems, setHistoryItems] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [pageLoading, setPageLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [adjusting, setAdjusting] = useState(false);
    const [redeeming, setRedeeming] = useState(false);
    const [syncingBooking, setSyncingBooking] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [adjustForm, setAdjustForm] = useState({
        user_id: "",
        points: "",
        note: "",
    });

    const [redeemForm, setRedeemForm] = useState({
        user_id: "",
        redeem_points: "",
        note: "",
    });

    const [bookingSyncId, setBookingSyncId] = useState("");

    const [filters, setFilters] = useState({
        userId: "",
        actionType: "",
        dateFrom: "",
        dateTo: "",
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        totalPages: 0,
    });

    const query = useMemo(
        () => ({
            page: pagination.page,
            limit: pagination.limit,
            userId: filters.userId,
            actionType: filters.actionType,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
        }),
        [filters.actionType, filters.dateFrom, filters.dateTo, filters.userId, pagination.limit, pagination.page]
    );

    async function loadConfig() {
        const data = await getRewardPointsConfig();
        const cfg = data.config || {};

        setConfigForm({
            status: Number(cfg.status || 0),
            cur_to_points_conv: String(cfg.cur_to_points_conv || ""),
            points_to_cur_conv: String(cfg.points_to_cur_conv || ""),
            min_points_redeemable: String(cfg.min_points_redeemable || ""),
        });
    }

    async function loadHistory() {
        setHistoryLoading(true);

        try {
            const data = await getRewardPointsHistory(query);
            setHistoryItems(data.items || []);
            setPagination((prev) => ({
                ...prev,
                page: Number(data.pagination?.page || prev.page),
                limit: Number(data.pagination?.limit || prev.limit),
                totalPages: Number(data.pagination?.totalPages || 0),
            }));
        } catch (error) {
            setHistoryItems([]);
            setErrorMessage(error?.response?.data?.message || "Không tải được lịch sử tích điểm.");
        } finally {
            setHistoryLoading(false);
        }
    }

    async function loadAll() {
        setPageLoading(true);
        setErrorMessage("");
        setMessage("");

        try {
            await Promise.all([loadConfig(), loadHistory()]);
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không tải được dữ liệu tích điểm.");
        } finally {
            setPageLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        loadHistory();
    }, [query]);

    async function handleSaveConfig(event) {
        event.preventDefault();
        setErrorMessage("");
        setMessage("");

        const curToPoints = Number(configForm.cur_to_points_conv);
        const pointsToCur = Number(configForm.points_to_cur_conv);
        const minRedeem = Number(configForm.min_points_redeemable);

        if (!Number.isFinite(curToPoints) || curToPoints <= 0) {
            setErrorMessage("Giá trị quy đổi tiền -> điểm phải lớn hơn 0.");
            return;
        }

        if (!Number.isFinite(pointsToCur) || pointsToCur <= 0) {
            setErrorMessage("Giá trị quy đổi điểm -> tiền phải lớn hơn 0.");
            return;
        }

        if (!Number.isInteger(minRedeem) || minRedeem < 1) {
            setErrorMessage("Điểm đổi tối thiểu phải là số nguyên >= 1.");
            return;
        }

        setSavingConfig(true);

        try {
            await updateRewardPointsConfig({
                status: Number(configForm.status),
                cur_to_points_conv: curToPoints,
                points_to_cur_conv: pointsToCur,
                min_points_redeemable: minRedeem,
            });

            setMessage("Đã cập nhật cấu hình tích điểm.");
            await loadConfig();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể cập nhật cấu hình tích điểm.");
        } finally {
            setSavingConfig(false);
        }
    }

    async function handleAdjust(event) {
        event.preventDefault();
        setErrorMessage("");
        setMessage("");

        const userId = Number(adjustForm.user_id);
        const points = Number(adjustForm.points);

        if (!Number.isInteger(userId) || userId < 1) {
            setErrorMessage("User ID điều chỉnh phải là số nguyên dương.");
            return;
        }

        if (!Number.isFinite(points) || points === 0) {
            setErrorMessage("Số điểm điều chỉnh phải là số và khác 0.");
            return;
        }

        setAdjusting(true);

        try {
            await adjustRewardPoints({
                user_id: userId,
                points,
                note: adjustForm.note.trim() || undefined,
            });

            setMessage("Điều chỉnh điểm thành công.");
            setAdjustForm({ user_id: "", points: "", note: "" });
            await loadHistory();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể điều chỉnh điểm.");
        } finally {
            setAdjusting(false);
        }
    }

    async function handleRedeem(event) {
        event.preventDefault();
        setErrorMessage("");
        setMessage("");

        const userId = Number(redeemForm.user_id);
        const redeemPointsValue = Number(redeemForm.redeem_points);

        if (!Number.isInteger(userId) || userId < 1) {
            setErrorMessage("User ID đổi điểm phải là số nguyên dương.");
            return;
        }

        if (!Number.isFinite(redeemPointsValue) || redeemPointsValue <= 0) {
            setErrorMessage("Số điểm đổi phải lớn hơn 0.");
            return;
        }

        setRedeeming(true);

        try {
            await redeemRewardPoints({
                user_id: userId,
                redeem_points: redeemPointsValue,
                note: redeemForm.note.trim() || undefined,
            });

            setMessage("Đổi điểm thành công.");
            setRedeemForm({ user_id: "", redeem_points: "", note: "" });
            await loadHistory();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể đổi điểm.");
        } finally {
            setRedeeming(false);
        }
    }

    async function handleProcessBooking(event) {
        event.preventDefault();
        setErrorMessage("");
        setMessage("");

        const bookingId = Number(bookingSyncId);
        if (!Number.isInteger(bookingId) || bookingId < 1) {
            setErrorMessage("Booking ID phải là số nguyên dương.");
            return;
        }

        setSyncingBooking(true);

        try {
            const result = await processBookingRewardPoints(bookingId);
            setMessage(result.processed ? "Đã cộng điểm cho booking." : (result.message || "Booking không đủ điều kiện cộng điểm."));
            setBookingSyncId("");
            await loadHistory();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể xử lý cộng điểm cho booking.");
        } finally {
            setSyncingBooking(false);
        }
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col gap-4 rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 px-4 py-5 text-white sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">Reward Points</p>
                    <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">Chương trình tích điểm</h1>
                </div>
                <button
                    type="button"
                    onClick={loadAll}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                    <RefreshCw className="h-4 w-4" /> Tải lại
                </button>
            </div>

            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
            {errorMessage ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Cấu hình tích điểm</h2>
                <form onSubmit={handleSaveConfig} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Trạng thái</label>
                        <select
                            value={configForm.status}
                            onChange={(event) => setConfigForm((prev) => ({ ...prev, status: Number(event.target.value) }))}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                        >
                            <option value={1}>Bật tích điểm</option>
                            <option value={0}>Tắt tích điểm</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tiền để nhận 1 điểm</label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={configForm.cur_to_points_conv}
                            onChange={(event) => setConfigForm((prev) => ({ ...prev, cur_to_points_conv: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                            placeholder="Ví dụ: 500"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giá trị tiền của 1 điểm</label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={configForm.points_to_cur_conv}
                            onChange={(event) => setConfigForm((prev) => ({ ...prev, points_to_cur_conv: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                            placeholder="Ví dụ: 100"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Điểm tối thiểu để đổi</label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={configForm.min_points_redeemable}
                            onChange={(event) => setConfigForm((prev) => ({ ...prev, min_points_redeemable: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                            placeholder="Ví dụ: 10"
                        />
                    </div>
                    <div className="md:col-span-2 xl:col-span-4">
                        <button
                            type="submit"
                            disabled={savingConfig}
                            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {savingConfig ? "Đang lưu..." : "Lưu cấu hình"}
                        </button>
                    </div>
                </form>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Thao tác nhanh cho admin</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <form onSubmit={handleAdjust} className="rounded-2xl border border-slate-200 p-4">
                        <h3 className="text-sm font-bold text-slate-900">Điều chỉnh điểm thủ công</h3>
                        <div className="mt-3 space-y-3">
                            <input type="number" min="1" step="1" value={adjustForm.user_id} onChange={(event) => setAdjustForm((prev) => ({ ...prev, user_id: event.target.value }))} placeholder="User ID" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500" />
                            <input type="number" step="0.1" value={adjustForm.points} onChange={(event) => setAdjustForm((prev) => ({ ...prev, points: event.target.value }))} placeholder="Điểm (+ để cộng, - để trừ)" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500" />
                            <input type="text" maxLength={255} value={adjustForm.note} onChange={(event) => setAdjustForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Ghi chú" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500" />
                            <button type="submit" disabled={adjusting} className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">{adjusting ? "Đang xử lý..." : "Điều chỉnh"}</button>
                        </div>
                    </form>
                    <form onSubmit={handleRedeem} className="rounded-2xl border border-slate-200 p-4">
                        <h3 className="text-sm font-bold text-slate-900">Đổi điểm thủ công</h3>
                        <div className="mt-3 space-y-3">
                            <input type="number" min="1" step="1" value={redeemForm.user_id} onChange={(event) => setRedeemForm((prev) => ({ ...prev, user_id: event.target.value }))} placeholder="User ID" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500" />
                            <input type="number" min="0.1" step="0.1" value={redeemForm.redeem_points} onChange={(event) => setRedeemForm((prev) => ({ ...prev, redeem_points: event.target.value }))} placeholder="Số điểm cần đổi" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500" />
                            <input type="text" maxLength={255} value={redeemForm.note} onChange={(event) => setRedeemForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Ghi chú" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500" />
                            <button type="submit" disabled={redeeming} className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{redeeming ? "Đang xử lý..." : "Đổi điểm"}</button>
                        </div>
                    </form>
                    <form onSubmit={handleProcessBooking} className="rounded-2xl border border-slate-200 p-4">
                        <h3 className="text-sm font-bold text-slate-900">Đồng bộ điểm theo booking</h3>
                        <div className="mt-3 space-y-3">
                            <input type="number" min="1" step="1" value={bookingSyncId} onChange={(event) => setBookingSyncId(event.target.value)} placeholder="Booking ID" className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500" />
                            <button type="submit" disabled={syncingBooking} className="w-full rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{syncingBooking ? "Đang xử lý..." : "Xử lý booking"}</button>
                        </div>
                    </form>
                </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Lịch sử điểm toàn hệ thống</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <input type="number" min="1" step="1" value={filters.userId} onChange={(event) => { setPagination((prev) => ({ ...prev, page: 1 })); setFilters((prev) => ({ ...prev, userId: event.target.value })); }} placeholder="Lọc theo User ID" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500" />
                    <select value={filters.actionType} onChange={(event) => { setPagination((prev) => ({ ...prev, page: 1 })); setFilters((prev) => ({ ...prev, actionType: event.target.value })); }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500">
                        {ACTION_OPTIONS.map((option) => (
                            <option key={option.value || "all"} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <input type="datetime-local" value={filters.dateFrom} onChange={(event) => { setPagination((prev) => ({ ...prev, page: 1 })); setFilters((prev) => ({ ...prev, dateFrom: event.target.value })); }} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500" />
                    <input type="datetime-local" value={filters.dateTo} onChange={(event) => { setPagination((prev) => ({ ...prev, page: 1 })); setFilters((prev) => ({ ...prev, dateTo: event.target.value })); }} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500" />
                    <button type="button" onClick={() => { setPagination((prev) => ({ ...prev, page: 1 })); loadHistory(); }} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500">Lọc dữ liệu</button>
                </div>
                {historyLoading ? (
                    <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Đang tải lịch sử...
                    </div>
                ) : (
                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Thời gian</th>
                                    <th className="px-4 py-3">Khách hàng</th>
                                    <th className="px-4 py-3">Hành động</th>
                                    <th className="px-4 py-3">Điểm</th>
                                    <th className="px-4 py-3">Giá trị tiền</th>
                                    <th className="px-4 py-3">Số dư</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historyItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm text-slate-700">#{item.id}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(item.date_created)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">#{item.user_id} {item.user_name?.trim() || "--"}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{item.action_label || "--"}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatNumber(item.points, 1)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{formatMoney(item.money_value)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{formatNumber(item.balance_before, 1)} {"->"} {formatNumber(item.balance_after, 1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-slate-500">Trang <span className="font-semibold text-slate-900">{pagination.page}</span> / {pagination.totalPages || 1}</p>
                    <div className="flex gap-2">
                        <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))} className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                        <button type="button" disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))} className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            </section>
        </div>
    );
}
