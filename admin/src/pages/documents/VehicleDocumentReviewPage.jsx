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
    const [rejectDialog, setRejectDialog] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
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

    async function handleReview(row, nextStatus, note = "") {
        const submissionId = Number(row.id);
        const actionKey = `${submissionId}-${nextStatus}`;
        setReviewingKey(actionKey);
        setError("");
        setSuccessMessage("");
        try {
            const payload = { status: nextStatus };
            if (note.trim()) payload.review_note = note.trim();
            await reviewVehicleDocumentSubmission(submissionId, payload);
            setRows((prev) =>
                prev.map((item) => {
                    if (Number(item.id) !== submissionId) return item;
                    if (nextStatus === "approved") {
                        return { ...item, verified: 1, status: "verified", review_note: "" };
                    }
                    if (nextStatus === "rejected") {
                        return { ...item, verified: 0, status: "rejected", review_note: note.trim() };
                    }
                    return { ...item, verified: 0, status: "expired", review_note: note.trim() };
                })
            );
            setSuccessMessage(`Đã cập nhật hồ sơ #${submissionId} thành công.`);
        } catch (reviewError) {
            setError(reviewError?.response?.data?.message || "Không thể cập nhật trạng thái duyệt.");
        } finally {
            setReviewingKey("");
        }
    }

    function openRejectDialog(row) {
        setRejectDialog(row);
        setRejectNote("");
    }

    async function confirmReject() {
        if (!rejectDialog) return;
        await handleReview(rejectDialog, "rejected", rejectNote);
        setRejectDialog(null);
        setRejectNote("");
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
                                    <th className="px-4 py-3">Tên giấy tờ</th>
                                    <th className="px-4 py-3">Số giấy tờ</th>
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
                                                {/* <p className="text-xs text-slate-500">Doc ID: {row.document_id || "--"}</p> */}
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
                                                        {approving ? "Đang duyệt..." : "Duyệt"}
                                                    </button>
                                                    <button type="button" disabled={Boolean(reviewingKey)} onClick={() => openRejectDialog(row)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-60">
                                                        <XCircle className="h-4 w-4" />
                                                        {rejecting ? "Đang từ chối..." : "Từ chối"}
                                                    </button>
                                                    <button type="button" disabled={Boolean(reviewingKey)} onClick={() => handleReview(row, "expired")} className="inline-flex items-center gap-1 rounded-xl border border-amber-200 px-3 py-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                                                        <Clock3 className="h-4 w-4" />
                                                        {expiring ? "Đang cập nhật..." : "Hết hạn"}
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

            {preview ? (() => {
                const pairedRow = preview.doc_two_sides
                    ? rows.find(
                          (r) =>
                              Number(r.vehicle_id) === Number(preview.vehicle_id) &&
                              Number(r.document_id) === Number(preview.document_id) &&
                              Number(r.id) !== Number(preview.id) &&
                              (r.side === "front" || r.side === "back")
                      ) ?? null
                    : null;

                const frontRow = preview.side === "front" ? preview : pairedRow?.side === "front" ? pairedRow : null;
                const backRow = preview.side === "back" ? preview : pairedRow?.side === "back" ? pairedRow : null;

                function FileView({ row, label }) {
                    if (!row?.file_url) {
                        return (
                            <div className="flex flex-col items-center gap-2">
                                {label ? <p className="text-xs font-semibold text-slate-500">{label}</p> : null}
                                <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                                    Chưa có ảnh
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div className="flex flex-col gap-1">
                            {label ? <p className="text-xs font-semibold text-slate-500">{label}</p> : null}
                            {row.mime_type && row.mime_type.startsWith("image/") ? (
                                <a href={row.file_url} target="_blank" rel="noreferrer">
                                    <img
                                        src={row.file_url}
                                        alt={label || "Tài liệu"}
                                        className="max-h-72 w-full rounded-2xl border border-slate-200 object-contain"
                                    />
                                </a>
                            ) : row.mime_type === "application/pdf" ? (
                                <div className="overflow-hidden rounded-2xl border border-slate-200">
                                    <iframe src={row.file_url} title={label || "Tài liệu PDF"} className="h-72 w-full" />
                                </div>
                            ) : (
                                <a href={row.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm text-blue-600 hover:bg-slate-50">
                                    Xem tài liệu
                                </a>
                            )}
                            {row.file_size ? (
                                <p className="text-xs text-slate-400">{row.mime_type} — {(row.file_size / 1024).toFixed(1)} KB</p>
                            ) : null}
                        </div>
                    );
                }

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setPreview(null)}>
                        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-slate-900">Hồ sơ phương tiện #{preview.id}</h3>

                            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Thông tin xe</p>
                                <p className="mt-1 font-semibold text-indigo-900">
                                    {[preview.brand, preview.model].filter(Boolean).join(" ") || "--"}
                                    {preview.year ? ` (${preview.year})` : ""}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-indigo-700">
                                    <span>Biển số: <span className="font-medium">{preview.license_plate || "--"}</span></span>
                                    {preview.color ? <span>Màu: <span className="font-medium">{preview.color}</span></span> : null}
                                    <span>Mã xe: <span className="font-medium">{preview.vehicle_id}</span></span>
                                    <span>Chủ xe: <span className="font-medium">#{preview.owner_id}</span></span>
                                </div>
                            </div>

                            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tài liệu</p>
                                    <p className="mt-0.5 font-medium text-slate-800">{preview.document_title || "--"}</p>
                                    {/* <p className="text-xs text-slate-500">Doc ID: {preview.document_id || "--"}</p> */}
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Số hồ sơ</p>
                                    <p className="mt-0.5 font-medium text-slate-800">{preview.doc_number || "--"}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hạn hồ sơ</p>
                                    <p className="mt-0.5 font-medium text-slate-800">{formatDate(preview.doc_expiry_date)}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ngày gửi</p>
                                    <p className="mt-0.5 font-medium text-slate-800">{formatDate(preview.date_submitted)}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trạng thái</p>
                                    <p className="mt-0.5 font-medium text-slate-800">{preview.status || "--"}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Xác thực</p>
                                    <p className={`mt-0.5 font-medium ${Number(preview.verified) === 1 ? "text-emerald-600" : "text-slate-500"}`}>
                                        {Number(preview.verified) === 1 ? "Đã xác thực" : "Chưa xác thực"}
                                    </p>
                                </div>
                            </div>

                            {preview.review_note ? (
                                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Ghi chú review</p>
                                    <p className="mt-1 text-sm text-amber-800">{preview.review_note}</p>
                                </div>
                            ) : null}

                            <div className="mt-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Hình ảnh / Tài liệu
                                    {preview.doc_two_sides ? " (2 mặt)" : ""}
                                </p>
                                {preview.doc_two_sides ? (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FileView row={frontRow} label="Mặt trước" />
                                        <FileView row={backRow} label="Mặt sau" />
                                    </div>
                                ) : (
                                    <FileView row={preview} label={null} />
                                )}
                            </div>

                            <div className="mt-4 flex justify-end">
                                <button type="button" onClick={() => setPreview(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })() : null}

            {rejectDialog ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="w-full max-w-md rounded-[28px] bg-white p-6">
                        <h3 className="text-lg font-bold text-slate-900">Từ chối hồ sơ #{rejectDialog.id}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {rejectDialog.document_title || "Tài liệu"} — Xe {rejectDialog.vehicle_id}
                        </p>
                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-slate-700">
                                Lý do từ chối <span className="font-normal text-slate-400">(bắt buộc)</span>
                            </label>
                            <textarea
                                className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-red-400"
                                rows={3}
                                placeholder="Nhập lý do để chủ xe biết cách bổ sung..."
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRejectDialog(null)}
                                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                disabled={!rejectNote.trim() || Boolean(reviewingKey)}
                                onClick={confirmReject}
                                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                            >
                                {reviewingKey ? "Đang xử lý..." : "Xác nhận từ chối"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
