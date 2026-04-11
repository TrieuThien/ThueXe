import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Eye, RefreshCw, XCircle } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SkeletonBlock from "../../components/common/SkeletonBlock";
import {
    getVehicleDocumentSubmissions,
    reviewVehicleDocumentSubmission,
} from "../../services/vehicleDocumentReviewService";

const DEFAULT_FILTERS = {
    id: "",
    document_id: "",
    vehicle_id: "",
    owner_id: "",
    verified: "",
    status: "",
};

function toQuery(filters) {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null) {
            params[key] = value;
        }
    });
    return params;
}

function validateFilters(filters) {
    const numericFields = ["id", "document_id", "vehicle_id", "owner_id"];
    for (const fieldName of numericFields) {
        const raw = String(filters[fieldName] ?? "").trim();
        if (!raw) continue;
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 1) {
            return `${fieldName} bắt buộc phải là số nguyên dương.`;
        }
    }
    return "";
}

function formatDate(value) {
    if (!value) return "--";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "--";
    return parsed.toLocaleString("vi-VN");
}

export default function VehicleDocumentReviewPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [filterError, setFilterError] = useState("");
    const [preview, setPreview] = useState(null);
    const [reviewingKey, setReviewingKey] = useState("");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

    const queryParams = useMemo(() => toQuery(appliedFilters), [appliedFilters]);

    async function loadData(params = queryParams) {
        setLoading(true);
        setError("");
        try {
            const response = await getVehicleDocumentSubmissions(params);
            setRows(response.items || []);
        } catch (loadError) {
            setRows([]);
            setError(loadError?.response?.data?.message || "Không thể tải danh sách hồ sơ phương tiện.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData(queryParams);
    }, [queryParams]);

    async function handleReview(row, nextStatus) {
        const submissionId = Number(row.id);
        const actionKey = `${submissionId}-${nextStatus}`;
        setReviewingKey(actionKey);
        setError("");
        setSuccessMessage("");
        try {
            await reviewVehicleDocumentSubmission(submissionId, { status: nextStatus });
            setRows((prev) =>
                prev.map((item) => {
                    if (Number(item.id) !== submissionId) return item;
                    if (nextStatus === "approved") {
                        return { ...item, verified: 1, status: "verified" };
                    }
                    if (nextStatus === "rejected") {
                        return { ...item, verified: 0, status: "rejected" };
                    }
                    return { ...item, verified: 0, status: "expired" };
                })
            );
            setSuccessMessage(`Đã cập nhật hồ sơ #${submissionId} thành công.`);
        } catch (reviewError) {
            setError(reviewError?.response?.data?.message || "Không thể cập nhật trạng thái duyệt.");
        } finally {
            setReviewingKey("");
        }
    }

    function handleApplyFilters(event) {
        event.preventDefault();
        const nextError = validateFilters(filters);
        setFilterError(nextError);
        if (nextError) return;
        setAppliedFilters({ ...filters });
    }

    function handleResetFilters() {
        setFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setFilterError("");
        setError("");
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge="Hồ sơ giấy tờ"
                title="Hồ sơ phương tiện"
                description="Kiểm duyệt hồ sơ phương tiện của chủ xe theo từng tài liệu."
                gradient="from-slate-950 via-slate-900 to-indigo-900"
                actions={
                    <button
                        type="button"
                        onClick={() => loadData(queryParams)}
                        className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                    >
                        <span className="inline-flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Tải lại
                        </span>
                    </button>
                }
            />

            <form onSubmit={handleApplyFilters} className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 xl:grid-cols-7">
                    <input type="text" value={filters.id} onChange={(event) => setFilters((prev) => ({ ...prev, id: event.target.value }))} placeholder="Mã yêu cầu" className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    <input type="text" value={filters.document_id} onChange={(event) => setFilters((prev) => ({ ...prev, document_id: event.target.value }))} placeholder="Mã hồ sơ" className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    <input type="text" value={filters.vehicle_id} onChange={(event) => setFilters((prev) => ({ ...prev, vehicle_id: event.target.value }))} placeholder="Mã phương tiện" className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    <input type="text" value={filters.owner_id} onChange={(event) => setFilters((prev) => ({ ...prev, owner_id: event.target.value }))} placeholder="Mã chủ xe" className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    <select value={filters.verified} onChange={(event) => setFilters((prev) => ({ ...prev, verified: event.target.value }))} className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500">
                        <option value="">Tất cả xác thực</option>
                        <option value="1">Đã xác thực</option>
                        <option value="0">Chưa xác thực</option>
                    </select>
                    <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500">
                        <option value="">Tất cả trạng thái</option>
                        <option value="missing">Còn thiếu</option>
                        <option value="pending">Đang chờ</option>
                        <option value="verified">Đã xác thực</option>
                        <option value="rejected">Bị từ chối</option>
                        <option value="expired">Hết hạn</option>
                    </select>
                    <div className="flex gap-2">
                        <button type="submit" className="min-h-11 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">Áp dụng</button>
                        <button type="button" onClick={handleResetFilters} className="min-h-11 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Đặt lại</button>
                    </div>
                </div>
                {filterError ? <p className="mt-2 text-sm text-red-600">{filterError}</p> : null}
            </form>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                {loading ? (
                    <div className="space-y-3 p-5">
                        <SkeletonBlock className="h-16" />
                        <SkeletonBlock className="h-16" />
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Xe/Chủ xe</th>
                                    <th className="px-4 py-3">Tài liệu</th>
                                    <th className="px-4 py-3">Số hồ sơ</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Xác thực</th>
                                    <th className="px-4 py-3">Ngày gửi</th>
                                    <th className="px-4 py-3">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const id = Number(row.id);
                                    const approving = reviewingKey === `${id}-approved`;
                                    const rejecting = reviewingKey === `${id}-rejected`;
                                    const expiring = reviewingKey === `${id}-expired`;

                                    return (
                                        <tr key={id} className="border-t border-slate-100">
                                            <td className="px-4 py-3 font-medium text-slate-900">{id}</td>
                                            <td className="px-4 py-3">
                                                <p>Xe: {row.vehicle_id || "--"}</p>
                                                <p className="text-xs text-slate-500">Chủ xe: {row.owner_id || "--"}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p>{row.document_title || "--"}</p>
                                                <p className="text-xs text-slate-500">Doc ID: {row.document_id || "--"}</p>
                                            </td>
                                            <td className="px-4 py-3">{row.doc_number || "--"}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                    {row.status || "--"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{Number(row.verified) === 1 ? "Đã xác thực" : "Chưa xác thực"}</td>
                                            <td className="px-4 py-3">{formatDate(row.date_submitted)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => setPreview(row)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                                                        <Eye className="h-4 w-4" />
                                                        Xem
                                                    </button>
                                                    <button type="button" disabled={Boolean(reviewingKey)} onClick={() => handleReview(row, "approved")} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        {approving ? "Đang duyệt..." : "Approve"}
                                                    </button>
                                                    <button type="button" disabled={Boolean(reviewingKey)} onClick={() => handleReview(row, "rejected")} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-60">
                                                        <XCircle className="h-4 w-4" />
                                                        {rejecting ? "Đang từ chối..." : "Reject"}
                                                    </button>
                                                    <button type="button" disabled={Boolean(reviewingKey)} onClick={() => handleReview(row, "expired")} className="inline-flex items-center gap-1 rounded-xl border border-amber-200 px-3 py-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                                                        <Clock3 className="h-4 w-4" />
                                                        {expiring ? "Đang cập nhật..." : "Expired"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {rows.length === 0 ? (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                                            Không có hồ sơ phù hợp.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {preview ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="w-full max-w-2xl rounded-[28px] bg-white p-6">
                        <h3 className="text-xl font-bold text-slate-900">Hồ sơ phương tiện #{preview.id}</h3>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <p>Vehicle ID: {preview.vehicle_id || "--"}</p>
                            <p>Owner ID: {preview.owner_id || "--"}</p>
                            <p>Document ID: {preview.document_id || "--"}</p>
                            <p>Tài liệu: {preview.document_title || "--"}</p>
                            <p>Số hồ sơ: {preview.doc_number || "--"}</p>
                            <p>Hạn hồ sơ: {preview.doc_expiry_date || "--"}</p>
                            <p>Trạng thái: {preview.status || "--"}</p>
                            <p>Xác thực: {Number(preview.verified) === 1 ? "Đã xác thực" : "Chưa xác thực"}</p>
                        </div>
                        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                            <p className="text-sm text-slate-500">Ghi chú review: {preview.review_note || "--"}</p>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => setPreview(null)} className="rounded-2xl border border-slate-300 px-4 py-2">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
