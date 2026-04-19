import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, RefreshCw, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import SkeletonBlock from "../../components/common/SkeletonBlock";
import { getDocuments, reviewDocument } from "../../services/adminService";

export default function DocumentReviewPage({ subject = "users" }) {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState(null);
    const [rejectDialog, setRejectDialog] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
    const [reviewing, setReviewing] = useState(false);
    const actorType = subject === "drivers" ? "driver" : subject === "vehicle-owners" ? "owner" : "user";
    const actorTypeLabel = subject === "drivers" ? "Tài xế" : subject === "vehicle-owners" ? "Chủ xe" : "Khách hàng";
    const [filters, setFilters] = useState({
        id: "",
        document_id: "",
        actor_type: actorType,
        verified: "",
    });
    const [appliedFilters, setAppliedFilters] = useState({
        id: "",
        document_id: "",
        actor_type: actorType,
        verified: "",
    });
    const [filterError, setFilterError] = useState("");

    const title = useMemo(() => {
        if (subject === "drivers") return t("adminModules.documents.driverTitle");
        if (subject === "vehicle-owners") return "Hồ sơ chủ xe";
        return t("adminModules.documents.userTitle");
    }, [subject, t]);

    const queryParams = useMemo(() => {
        const params = {};
        if (appliedFilters.id !== "") params.id = appliedFilters.id;
        if (appliedFilters.document_id !== "") params.document_id = appliedFilters.document_id;
        if (appliedFilters.verified !== "") params.verified = appliedFilters.verified;
        params.actor_type = actorType;
        return params;
    }, [appliedFilters, actorType]);

    function validateFilters(nextFilters) {
        const numericFields = ["id", "document_id"];
        for (const fieldName of numericFields) {
            const raw = String(nextFilters[fieldName] ?? "").trim();
            if (!raw) continue;
            const value = Number(raw);
            if (!Number.isInteger(value) || value < 1) {
                return `${fieldName} bắt buộc phải là một số nguyên dương.`;
            }
        }
        return "";
    }

    async function loadData(params = queryParams) {
        setLoading(true);
        setError("");
        try {
            const response = await getDocuments(params);
            setRows(response.items || []);
        } catch (loadError) {
            setError(loadError?.response?.data?.message || t("adminModules.loadFailed"));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const resetFilters = {
            id: "",
            document_id: "",
            actor_type: actorType,
            verified: "",
        };
        setFilters(resetFilters);
        setAppliedFilters(resetFilters);
        setFilterError("");
    }, [actorType]);

    useEffect(() => {
        loadData(queryParams);
    }, [queryParams]);

    async function handleReview(row, decision, note = "") {
        const reviewStatus = decision === "approve" ? "approved" : "rejected";
        setReviewing(true);
        try {
            const payload = { status: reviewStatus };
            if (note.trim()) payload.review_note = note.trim();
            await reviewDocument(row.actor_type, row.id, payload);
            setRows((prev) => prev.map((item) => {
                if (item.id === row.id && item.actor_type === row.actor_type) {
                    return { ...item, verified: reviewStatus === "approved" ? 1 : 0, review_note: note.trim() || item.review_note };
                }
                return item;
            }));
            if (reviewStatus === "approved") {
                toast.success(`Đã duyệt hồ sơ #${row.id} thành công.`);
            } else {
                toast.success(`Đã từ chối hồ sơ #${row.id}.`);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Không thể cập nhật trạng thái hồ sơ.");
        } finally {
            setReviewing(false);
        }
    }

    function openRejectDialog(row) {
        setRejectDialog(row);
        setRejectNote("");
    }

    async function confirmReject() {
        if (!rejectDialog) return;
        await handleReview(rejectDialog, "reject", rejectNote);
        setRejectDialog(null);
        setRejectNote("");
    }

    function handleApplyFilters(event) {
        event.preventDefault();
        const nextError = validateFilters(filters);
        setFilterError(nextError);
        if (nextError) return;
        setAppliedFilters({ ...filters, actor_type: actorType });
    }

    function handleResetFilters() {
        const resetFilters = {
            id: "",
            document_id: "",
            actor_type: actorType,
            verified: "",
        };
        setFilters(resetFilters);
        setAppliedFilters(resetFilters);
        setFilterError("");
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge={t("adminModules.documents.badge")}
                title={title}
                description={t("adminModules.documents.desc")}
                gradient="from-slate-950 via-slate-900 to-indigo-900"
                actions={<button type="button" onClick={() => loadData(queryParams)} className="rounded-2xl border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t("adminModules.refresh")}</span></button>}
            />

            <form onSubmit={handleApplyFilters} className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 lg:grid-cols-5">
                    <input
                        type="text"
                        value={filters.id}
                        onChange={(event) => setFilters((prev) => ({ ...prev, id: event.target.value }))}
                        placeholder="Mã yêu cầu"
                        className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                    />
                    <input
                        type="text"
                        value={filters.document_id}
                        onChange={(event) => setFilters((prev) => ({ ...prev, document_id: event.target.value }))}
                        placeholder="Mã hồ sơ"
                        className="min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                    />
                    <select
                        value={filters.actor_type}
                        disabled
                        className="min-h-11 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-600 outline-none"
                    >
                        <option value={filters.actor_type}>{actorTypeLabel}</option>
                    </select>
                    <select
                        value={filters.verified}
                        onChange={(event) => setFilters((prev) => ({ ...prev, verified: event.target.value }))}
                        className="min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="1">Đã xác thực</option>
                        <option value="0">Chưa xác thực</option>
                    </select>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="min-h-11 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                            Áp dụng
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="min-h-11 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Đặt lại
                        </button>
                    </div>
                </div>
                {filterError ? <p className="mt-2 text-sm text-red-600">{filterError}</p> : null}
            </form>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                {loading ? (
                    <div className="space-y-3 p-5"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /></div>
                ) : (
                    <>
                        {error ? <p className="px-5 py-3 text-sm text-red-600">{error}</p> : null}
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Mã yêu cầu</th><th className="px-4 py-3">Người thực hiện</th><th className="px-4 py-3">Hồ sơ</th><th className="px-4 py-3">Số hồ sơ</th><th className="px-4 py-3">Đã xác thực</th><th className="px-4 py-3">Ngày gửi</th><th className="px-4 py-3">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={`${row.actor_type}-${row.id}`} className="border-t border-slate-100">
                                            <td className="px-4 py-3 font-medium text-slate-900">{row.id}</td>
                                            <td className="px-4 py-3">ID chủ xe: #{row.actor_id} <br />Họ tên: {row.actor_name || "--"} </td>
                                            <td className="px-4 py-3">{row.title || "--"}</td>
                                            <td className="px-4 py-3">{row.doc_number || "--"}</td>
                                            <td className="px-4 py-3">{Number(row.verified) === 1 ? "Đã xác thực" : "Chưa xác thực"}</td>
                                            <td className="px-4 py-3">{row.date_submitted ? new Date(row.date_submitted).toLocaleString("vi-VN") : "--"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => setPreview(row)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-50"><Eye className="h-4 w-4" />Chi tiết</button>
                                                    <button type="button" disabled={reviewing} onClick={() => handleReview(row, "approve")} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />Duyệt</button>
                                                    <button type="button" disabled={reviewing} onClick={() => openRejectDialog(row)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-60"><XCircle className="h-4 w-4" />Từ chối</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>

            {preview ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setPreview(null)}>
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-900">{preview.title || "--"}</h3>

                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Người thực hiện</p>
                                <p className="mt-0.5 font-medium text-slate-800">{preview.actor_name || "--"} <span className="text-slate-400 text-xs">(#{preview.actor_id})</span></p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Số hồ sơ</p>
                                <p className="mt-0.5 font-medium text-slate-800">{preview.doc_number || "--"}</p>
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
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hạn hồ sơ</p>
                                <p className="mt-0.5 font-medium text-slate-800">
                                    {preview.doc_expiry_date ? new Date(preview.doc_expiry_date).toLocaleDateString("vi-VN") : "--"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ngày gửi</p>
                                <p className="mt-0.5 font-medium text-slate-800">
                                    {preview.date_submitted ? new Date(preview.date_submitted).toLocaleString("vi-VN") : "--"}
                                </p>
                            </div>
                        </div>

                        {preview.review_note ? (
                            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Ghi chú review</p>
                                <p className="mt-1 text-sm text-amber-800">{preview.review_note}</p>
                            </div>
                        ) : null}

                        <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Hình ảnh / Tài liệu</p>
                            {preview.file_url ? (
                                preview.mime_type && preview.mime_type.startsWith("image/") ? (
                                    <a href={preview.file_url} target="_blank" rel="noreferrer">
                                        <img
                                            src={preview.file_url}
                                            alt={preview.title || "Tài liệu"}
                                            className="max-h-80 w-full rounded-2xl border border-slate-200 object-contain"
                                        />
                                    </a>
                                ) : preview.mime_type === "application/pdf" ? (
                                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                                        <iframe src={preview.file_url} title={preview.title || "PDF"} className="h-80 w-full" />
                                    </div>
                                ) : (
                                    <a href={preview.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm text-blue-600 hover:bg-slate-50">
                                        Xem tài liệu
                                    </a>
                                )
                            ) : (
                                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                                    Chưa có ảnh / tài liệu
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => setPreview(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Đóng</button>
                        </div>
                    </div>
                </div>
            ) : null}

            {rejectDialog ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="w-full max-w-md rounded-[28px] bg-white p-6">
                        <h3 className="text-lg font-bold text-slate-900">Từ chối hồ sơ #{rejectDialog.id}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {rejectDialog.title || "Tài liệu"} — {rejectDialog.actor_name || `Chủ xe #${rejectDialog.actor_id}`}
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
                                disabled={!rejectNote.trim() || reviewing}
                                onClick={confirmReject}
                                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                            >
                                {reviewing ? "Đang xử lý..." : "Xác nhận từ chối"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

