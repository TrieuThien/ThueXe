import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, RefreshCw, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import SkeletonBlock from "../../components/common/SkeletonBlock";
import { getDocuments, reviewDocument } from "../../services/adminService";

export default function DocumentReviewPage({ subject = "users" }) {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState(null);
    const actorType = subject === "drivers" ? "driver" : "user";
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

    async function handleReview(row, decision) {
        const reviewStatus = decision === "approve" ? "approved" : "rejected";
        await reviewDocument(row.actor_type, row.id, { status: reviewStatus });
        setRows((prev) => prev.map((item) => {
            if (item.id === row.id && item.actor_type === row.actor_type) {
                return { ...item, verified: reviewStatus === "approved" ? 1 : 0 };
            }
            return item;
        }));
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
                                            <td className="px-4 py-3">{row.actor_type}:{row.actor_id} - {row.actor_name || "--"}</td>
                                            <td className="px-4 py-3">{row.title || "--"}</td>
                                            <td className="px-4 py-3">{row.doc_number || "--"}</td>
                                            <td className="px-4 py-3">{Number(row.verified) === 1 ? "Đã xác thực" : "Chưa xác thực"}</td>
                                            <td className="px-4 py-3">{row.date_submitted ? new Date(row.date_submitted).toLocaleString("vi-VN") : "--"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => setPreview(row)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-50"><Eye className="h-4 w-4" />View</button>
                                                    <button type="button" onClick={() => handleReview(row, "approve")} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" />Approve</button>
                                                    <button type="button" onClick={() => handleReview(row, "reject")} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50"><XCircle className="h-4 w-4" />Reject</button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <div className="w-full max-w-2xl rounded-[28px] bg-white p-6">
                        <h3 className="text-xl font-bold text-slate-900">{preview.title || "--"}</h3>
                        <p className="mt-2 text-sm text-slate-600">Người dùng: {preview.actor_type}:{preview.actor_id}</p>
                        <p className="mt-1 text-sm text-slate-600">Số hồ sơ: {preview.doc_number || "--"}</p>
                        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                            <p className="text-sm text-slate-500">Current API does not expose direct file URL in list response.</p>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => setPreview(null)} className="rounded-2xl border border-slate-300 px-4 py-2">Đóng</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

