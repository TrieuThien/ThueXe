import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pencil, Plus, RefreshCw, Save, Search, ShieldOff } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import {
    createDocumentDefinition,
    getDocumentDefinitions,
    updateDocumentDefinition,
} from "../../services/documentDefinitionService";

const TARGET_OPTIONS = [
    { key: "customer", label: "Khách hàng", doc_user: 0, doc_type: 0 },
    { key: "driver", label: "Tài xế", doc_user: 1, doc_type: 0 },
    { key: "owner", label: "Chủ xe", doc_user: 2, doc_type: 0 },
    { key: "vehicle", label: "Xe", doc_user: 2, doc_type: 1 },
];

const TARGET_MAP = TARGET_OPTIONS.reduce((acc, option) => {
    acc[option.key] = option;
    return acc;
}, {});

const DEFAULT_FILTERS = {
    id: "",
    document_id: "",
    doc_user: "",
    doc_type: "",
    status: "",
    doc_city: "",
};

const DEFAULT_FORM = {
    target: "customer",
    title: "",
    doc_desc: "",
    doc_city: "",
    doc_expiry: "0",
    doc_id_num: "0",
    doc_id_num_title: "",
    doc_id_num_desc: "",
    status: "1",
};

function getTargetByDocumentType(document) {
    return (
        TARGET_OPTIONS.find(
            (option) =>
                Number(option.doc_user) === Number(document.doc_user) &&
                Number(option.doc_type) === Number(document.doc_type)
        ) || null
    );
}

function normalizeText(value) {
    return String(value ?? "").trim();
}

function validateFilters(filters) {
    const errors = {};
    const numericFields = ["id", "document_id", "doc_city"];

    numericFields.forEach((fieldName) => {
        const raw = String(filters[fieldName] ?? "").trim();
        if (!raw) return;
        const number = Number(raw);
        if (!Number.isInteger(number) || number < 1) {
            errors[fieldName] = `${fieldName} phải là một số nguyên dương.`;
        }
    });

    return errors;
}

function validateForm(form) {
    const errors = {};
    const title = normalizeText(form.title);
    const description = normalizeText(form.doc_desc);
    const numberTitle = normalizeText(form.doc_id_num_title);
    const numberDescription = normalizeText(form.doc_id_num_desc);
    const cityRaw = String(form.doc_city ?? "").trim();

    if (!TARGET_MAP[form.target]) {
        errors.target = "Invalid target.";
    }
    if (title.length < 2 || title.length > 255) {
        errors.title = "title phải là một chuỗi có độ dài từ 2 đến 255 ký tự.";
    }
    if (description.length < 2 || description.length > 1000) {
        errors.doc_desc = "doc_desc phải là một chuỗi có độ dài từ 2 đến 1000 ký tự.";
    }
    if (cityRaw) {
        const city = Number(cityRaw);
        if (!Number.isInteger(city) || city < 1) {
            errors.doc_city = "doc_city phải là một số nguyên dương.";
        }
    }
    if (!["0", "1"].includes(String(form.doc_expiry))) {
        errors.doc_expiry = "doc_expiry phải là 0 hoặc 1.";
    }
    if (!["0", "1"].includes(String(form.doc_id_num))) {
        errors.doc_id_num = "doc_id_num phải là 0 hoặc 1.";
    }
    if (numberTitle.length > 255) {
        errors.doc_id_num_title = "doc_id_num_title phải không được vượt quá 255 ký tự.";
    }
    if (numberDescription.length > 1000) {
        errors.doc_id_num_desc = "doc_id_num_desc phải không được vượt quá 1000 ký tự.";
    }
    if (String(form.doc_id_num) === "1" && numberTitle.length < 2) {
        errors.doc_id_num_title = "doc_id_num_title là bắt buộc khi doc_id_num được bật.";
    }
    if (!["0", "1"].includes(String(form.status))) {
        errors.status = "status phải là 0 hoặc 1.";
    }

    return errors;
}

export default function DocumentDefinitionsPage() {
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [filterErrors, setFilterErrors] = useState({});
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState({});

    const query = useMemo(() => {
        const params = {};
        Object.entries(appliedFilters).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params[key] = value;
            }
        });
        return params;
    }, [appliedFilters]);

    async function loadDefinitions() {
        setLoading(true);
        setErrorMessage("");
        try {
            const data = await getDocumentDefinitions(query);
            setRows(data.items || []);
        } catch (error) {
            setRows([]);
            setErrorMessage(error?.response?.data?.message || "Không thể tải trang định nghĩa hồ sơ.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDefinitions();
    }, [query]);

    function resetForm() {
        setEditingId(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
    }

    function toPayload(inputForm) {
        const target = TARGET_MAP[inputForm.target];
        return {
            title: normalizeText(inputForm.title),
            doc_desc: normalizeText(inputForm.doc_desc),
            doc_city: inputForm.doc_city === "" ? undefined : Number(inputForm.doc_city),
            doc_type: Number(target.doc_type),
            doc_user: Number(target.doc_user),
            doc_expiry: Number(inputForm.doc_expiry),
            doc_id_num: Number(inputForm.doc_id_num),
            doc_id_num_title: normalizeText(inputForm.doc_id_num_title),
            doc_id_num_desc: normalizeText(inputForm.doc_id_num_desc),
            status: Number(inputForm.status),
        };
    }

    async function handleSubmitForm(event) {
        event.preventDefault();
        const errors = validateForm(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
            setErrorMessage("Vui lòng sửa các lỗi xác thực biểu mẫu.");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            if (editingId) {
                await updateDocumentDefinition(editingId, toPayload(form));
                setSuccessMessage("Cập nhật định nghĩa hồ sơ thành công.");
            } else {
                await createDocumentDefinition(toPayload(form));
                setSuccessMessage("Tạo định nghĩa hồ sơ thành công.");
            }
            resetForm();
            await loadDefinitions();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể lưu định nghĩa hồ sơ.");
        } finally {
            setSubmitting(false);
        }
    }

    function handleEdit(row) {
        const target = getTargetByDocumentType(row);
        if (!target) {
            setErrorMessage("Unsupported doc_user/doc_type mapping.");
            return;
        }

        setEditingId(Number(row.id));
        setFormErrors({});
        setForm({
            target: target.key,
            title: row.title || "",
            doc_desc: row.doc_desc || "",
            doc_city: row.doc_city === null || row.doc_city === undefined ? "" : String(row.doc_city),
            doc_expiry: String(Number(row.doc_expiry || 0)),
            doc_id_num: String(Number(row.doc_id_num || 0)),
            doc_id_num_title: row.doc_id_num_title || "",
            doc_id_num_desc: row.doc_id_num_desc || "",
            status: String(Number(row.status || 0)),
        });
    }

    async function handleToggleStatus(row) {
        const target = getTargetByDocumentType(row);
        if (!target) {
            setErrorMessage("Unsupported doc_user/doc_type mapping.");
            return;
        }

        const nextStatus = Number(row.status) === 1 ? 0 : 1;
        setTogglingId(Number(row.id));
        setErrorMessage("");
        setSuccessMessage("");

        try {
            await updateDocumentDefinition(Number(row.id), {
                title: row.title || "",
                doc_desc: row.doc_desc || "",
                doc_city: row.doc_city === null ? undefined : Number(row.doc_city),
                doc_type: Number(target.doc_type),
                doc_user: Number(target.doc_user),
                doc_expiry: Number(row.doc_expiry || 0),
                doc_id_num: Number(row.doc_id_num || 0),
                doc_id_num_title: row.doc_id_num_title || "",
                doc_id_num_desc: row.doc_id_num_desc || "",
                status: nextStatus,
            });
            setSuccessMessage(nextStatus === 1 ? "Cập nhật định nghĩa hồ sơ thành công." : "Vô hiệu hóa định nghĩa hồ sơ thành công.");
            await loadDefinitions();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể cập nhật trạng thái.");
        } finally {
            setTogglingId(null);
        }
    }

    function handleApplyFilters(event) {
        event.preventDefault();
        const errors = validateFilters(filters);
        setFilterErrors(errors);
        if (Object.keys(errors).length > 0) {
            setErrorMessage("Vui lòng sửa các lỗi xác thực bộ lọc.");
            return;
        }
        setAppliedFilters({ ...filters });
        setErrorMessage("");
    }

    function handleResetFilters() {
        setFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
        setFilterErrors({});
        setErrorMessage("");
    }

    return (
        <div className="space-y-6">
            <PageHeader
                badge="Documents"
                title="Định nghĩa hồ sơ"
                description="Quản lý các loại hồ sơ yêu cầu đối với khách hàng, tài xế, chủ xe và xe."
                gradient="from-slate-950 via-slate-900 to-indigo-900"
                actions={
                    <button
                        type="button"
                        onClick={loadDefinitions}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                        <RefreshCw className="h-4 w-4" /> Tải lại
                    </button>
                }
            />

            <form onSubmit={handleApplyFilters} className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 xl:grid-cols-6">
                    <div>
                        <label htmlFor="filter-id" className="mb-2 block text-sm font-semibold text-slate-700">ID</label>
                        <input id="filter-id" type="text" value={filters.id} onChange={(event) => setFilters((prev) => ({ ...prev, id: event.target.value }))} placeholder="ID" className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="filter-document-id" className="mb-2 block text-sm font-semibold text-slate-700">Document ID</label>
                        <input id="filter-document-id" type="text" value={filters.document_id} onChange={(event) => setFilters((prev) => ({ ...prev, document_id: event.target.value }))} placeholder="Document ID" className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="filter-doc-user" className="mb-2 block text-sm font-semibold text-slate-700">Đối tượng</label>
                        <select id="filter-doc-user" value={filters.doc_user} onChange={(event) => setFilters((prev) => ({ ...prev, doc_user: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500">
                            <option value="">Tất cả</option>
                            <option value="0">Khách hàng</option>
                            <option value="1">Tài xế</option>
                            <option value="2">Chủ xe/phương tiện</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-doc-type" className="mb-2 block text-sm font-semibold text-slate-700">Loại hồ sơ</label>
                        <select id="filter-doc-type" value={filters.doc_type} onChange={(event) => setFilters((prev) => ({ ...prev, doc_type: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500">
                            <option value="">Tất cả</option>
                            <option value="0">Cá nhân</option>
                            <option value="1">Tài liệu phương tiện</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-status" className="mb-2 block text-sm font-semibold text-slate-700">Tình trạng</label>
                        <select id="filter-status" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500">
                            <option value="">Tất cả</option>
                            <option value="1">Đã kích hoạt</option>
                            <option value="0">Không kích hoạt</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-doc-city" className="mb-2 block text-sm font-semibold text-slate-700">Khu vực</label>
                        <input id="filter-doc-city" type="text" value={filters.doc_city} onChange={(event) => setFilters((prev) => ({ ...prev, doc_city: event.target.value }))} placeholder="Hồ Chí Minh" className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    </div>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {Object.entries(filterErrors).map(([field, message]) => (
                        <p key={field} className="text-sm text-red-600">{message}</p>
                    ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"><Search className="h-4 w-4" />Áp dụng bộ lọc</button>
                    <button type="button" onClick={handleResetFilters} className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Đặt lại</button>
                </div>
            </form>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-slate-900"><Plus className="h-5 w-5" /><h2 className="text-xl font-bold">{editingId ? `Edit definition #${editingId}` : "Create definition"}</h2></div>

                <form onSubmit={handleSubmitForm} className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Target</label>
                            <select value={form.target} onChange={(event) => setForm((prev) => ({ ...prev, target: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                {TARGET_OPTIONS.map((option) => (<option key={option.key} value={option.key}>{option.label}</option>))}
                            </select>
                            {formErrors.target ? <p className="mt-2 text-sm text-red-600">{formErrors.target}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Tình trạng</label>
                            <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                <option value="1">Kích hoạt</option>
                                <option value="0">Không kích hoạt</option>
                            </select>
                            {formErrors.status ? <p className="mt-2 text-sm text-red-600">{formErrors.status}</p> : null}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tiêu đề</label>
                        <input type="text" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="Ví dụ: Căn cước công dân" />
                        {formErrors.title ? <p className="mt-2 text-sm text-red-600">{formErrors.title}</p> : null}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả</label>
                        <textarea value={form.doc_desc} onChange={(event) => setForm((prev) => ({ ...prev, doc_desc: event.target.value }))} rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="Mô tả chi tiết tài liệu yêu cầu " />
                        {formErrors.doc_desc ? <p className="mt-2 text-sm text-red-600">{formErrors.doc_desc}</p> : null}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Khu vực (tùy chọn)</label>
                            <input type="text" value={form.doc_city} onChange={(event) => setForm((prev) => ({ ...prev, doc_city: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="ID thành phố" />
                            {formErrors.doc_city ? <p className="mt-2 text-sm text-red-600">{formErrors.doc_city}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Thời hạn hồ sơ</label>
                            <select value={form.doc_expiry} onChange={(event) => setForm((prev) => ({ ...prev, doc_expiry: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                <option value="0">Không yêu cầu hết hạn</option>
                                <option value="1">Yêu cầu hết hạn</option>
                            </select>
                            {formErrors.doc_expiry ? <p className="mt-2 text-sm text-red-600">{formErrors.doc_expiry}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Số hiệu tài liệu</label>
                            <select value={form.doc_id_num} onChange={(event) => setForm((prev) => ({ ...prev, doc_id_num: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                <option value="0">Không yêu cầu số hiệu</option>
                                <option value="1">Yêu cầu số hiệu</option>
                            </select>
                            {formErrors.doc_id_num ? <p className="mt-2 text-sm text-red-600">{formErrors.doc_id_num}</p> : null}
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Tiêu đề số hiệu tài liệu</label>
                            <input type="text" value={form.doc_id_num_title} onChange={(event) => setForm((prev) => ({ ...prev, doc_id_num_title: event.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="Ví dụ: Mã số căn cước công dân" />
                            {formErrors.doc_id_num_title ? <p className="mt-2 text-sm text-red-600">{formErrors.doc_id_num_title}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả số hiệu tài liệu</label>
                            <input value={form.doc_id_num_desc} onChange={(event) => setForm((prev) => ({ ...prev, doc_id_num_desc: event.target.value }))} rows={2} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="Gợi ý bổ sung cho số tài liệu" />
                            {formErrors.doc_id_num_desc ? <p className="mt-2 text-sm text-red-600">{formErrors.doc_id_num_desc}</p> : null}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editingId ? "Lưu" : "Tạo"}</button>
                        {editingId ? <button type="button" onClick={resetForm} className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Hủy</button> : null}
                    </div>
                </form>
            </section>

            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}
            {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{successMessage}</span></div> : null}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {loading ? (
                    <div className="flex min-h-56 items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải...</div>
                ) : rows.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500">Không tìm thấy tài liệu.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Tiêu đề</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Thành phố</th><th className="px-4 py-3">Cờ</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Hành động</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => {
                                    const target = getTargetByDocumentType(row);
                                    const targetLabel = target?.label || `doc_user=${row.doc_user}, doc_type=${row.doc_type}`;
                                    const isActive = Number(row.status) === 1;

                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50/80">
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">#{row.id}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700"><p className="font-semibold text-slate-900">{row.title}</p><p className="line-clamp-2 text-xs text-slate-500">{row.doc_desc}</p></td>
                                            <td className="px-4 py-3 text-sm text-slate-700"><p>{targetLabel}</p><p className="text-xs text-slate-500">doc_user={row.doc_user}, doc_type={row.doc_type}</p></td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{row.doc_city ?? "ALL"}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600"><p>expiry: {Number(row.doc_expiry || 0)}</p><p>id_num: {Number(row.doc_id_num || 0)}</p></td>
                                            <td className="px-4 py-3 text-sm"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{isActive ? "active" : "inactive"}</span></td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => handleEdit(row)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /> Sửa</button>
                                                    <button type="button" disabled={togglingId === Number(row.id)} onClick={() => handleToggleStatus(row)} className="inline-flex items-center gap-1 rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60">{togglingId === Number(row.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}{isActive ? "Vô hiệu hóa" : "Kích hoạt"}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
