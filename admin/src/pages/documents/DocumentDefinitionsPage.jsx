import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pencil, Plus, RefreshCw, Save, Search, FilePenLine, Check, X, ShieldCheck, ShieldX } from "lucide-react";
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
    { key: "vehicle", label: "Phương tiện", doc_user: 2, doc_type: 1 },
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
    doc_two_sides: "0",
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
    if (!["0", "1"].includes(String(form.doc_two_sides))) {
        errors.doc_two_sides = "doc_two_sides phải là 0 hoặc 1.";
    }
    if (!["0", "1"].includes(String(form.status))) {
        errors.status = "status phải là 0 hoặc 1.";
    }

    return errors;
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
        doc_two_sides: Number(inputForm.doc_two_sides),
        status: Number(inputForm.status),
    };
}

function DocumentFormModal({ editingId, form, formErrors, submitting, onChangeForm, onSubmit, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 pt-12">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        {editingId ? <Pencil className="h-5 w-5 text-indigo-600" /> : <Plus className="h-5 w-5 text-indigo-600" />}
                        <h2 className="text-lg font-bold text-slate-900">
                            {editingId ? `Chỉnh sửa hồ sơ yêu cầu #${editingId}` : "Tạo mới hồ sơ yêu cầu"}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Đối tượng</label>
                            <select value={form.target} onChange={(e) => onChangeForm("target", e.target.value)} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                {TARGET_OPTIONS.map((option) => (<option key={option.key} value={option.key}>{option.label}</option>))}
                            </select>
                            {formErrors.target ? <p className="mt-1.5 text-sm text-red-600">{formErrors.target}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Tình trạng</label>
                            <select value={form.status} onChange={(e) => onChangeForm("status", e.target.value)} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                <option value="1">Kích hoạt</option>
                                <option value="0">Không kích hoạt</option>
                            </select>
                            {formErrors.status ? <p className="mt-1.5 text-sm text-red-600">{formErrors.status}</p> : null}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tiêu đề</label>
                        <input type="text" value={form.title} onChange={(e) => onChangeForm("title", e.target.value)} className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="Ví dụ: Căn cước công dân" />
                        {formErrors.title ? <p className="mt-1.5 text-sm text-red-600">{formErrors.title}</p> : null}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả</label>
                        <textarea value={form.doc_desc} onChange={(e) => onChangeForm("doc_desc", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="Mô tả chi tiết tài liệu yêu cầu" />
                        {formErrors.doc_desc ? <p className="mt-1.5 text-sm text-red-600">{formErrors.doc_desc}</p> : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Khu vực (tùy chọn)</label>
                            <input type="text" value={form.doc_city} onChange={(e) => onChangeForm("doc_city", e.target.value)} className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="ID thành phố" />
                            {formErrors.doc_city ? <p className="mt-1.5 text-sm text-red-600">{formErrors.doc_city}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Thời hạn hồ sơ</label>
                            <select value={form.doc_expiry} onChange={(e) => onChangeForm("doc_expiry", e.target.value)} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                <option value="0">Không yêu cầu</option>
                                <option value="1">Yêu cầu thời hạn</option>
                            </select>
                            {formErrors.doc_expiry ? <p className="mt-1.5 text-sm text-red-600">{formErrors.doc_expiry}</p> : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Số hiệu tài liệu</label>
                            <select value={form.doc_id_num} onChange={(e) => onChangeForm("doc_id_num", e.target.value)} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500">
                                <option value="0">Không yêu cầu</option>
                                <option value="1">Yêu cầu số hiệu</option>
                            </select>
                            {formErrors.doc_id_num ? <p className="mt-1.5 text-sm text-red-600">{formErrors.doc_id_num}</p> : null}
                        </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <input
                            id="modal-doc-two-sides"
                            type="checkbox"
                            checked={form.doc_two_sides === "1"}
                            onChange={(e) => onChangeForm("doc_two_sides", e.target.checked ? "1" : "0")}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                        />
                        <div>
                            <label htmlFor="modal-doc-two-sides" className="cursor-pointer text-sm font-semibold text-slate-700">Yêu cầu ảnh hai mặt</label>
                            <p className="text-xs text-slate-500">Khi bật, chủ xe/tài xế phải tải lên cả ảnh mặt trước và mặt sau của tài liệu.</p>
                        </div>
                        {formErrors.doc_two_sides ? <p className="mt-1.5 text-sm text-red-600">{formErrors.doc_two_sides}</p> : null}
                    </div>

                    {String(form.doc_id_num) === "1" ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tiêu đề số hiệu</label>
                                <input type="text" value={form.doc_id_num_title} onChange={(e) => onChangeForm("doc_id_num_title", e.target.value)} className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="Ví dụ: Mã số căn cước công dân" />
                                {formErrors.doc_id_num_title ? <p className="mt-1.5 text-sm text-red-600">{formErrors.doc_id_num_title}</p> : null}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả số hiệu</label>
                                <input value={form.doc_id_num_desc} onChange={(e) => onChangeForm("doc_id_num_desc", e.target.value)} className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-500" placeholder="Gợi ý bổ sung cho số tài liệu" />
                                {formErrors.doc_id_num_desc ? <p className="mt-1.5 text-sm text-red-600">{formErrors.doc_id_num_desc}</p> : null}
                            </div>
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            Hủy
                        </button>
                        <button type="submit" disabled={submitting} className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {editingId ? "Lưu thay đổi" : "Tạo hồ sơ"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
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
    const [modalOpen, setModalOpen] = useState(false);
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

    function openCreateModal() {
        setEditingId(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setErrorMessage("");
        setModalOpen(true);
    }

    function openEditModal(row) {
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
            doc_two_sides: String(Number(row.doc_two_sides || 0)),
            status: String(Number(row.status || 0)),
        });
        setErrorMessage("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingId(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
    }

    function handleChangeForm(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmitForm(event) {
        event.preventDefault();
        const errors = validateForm(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

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
            closeModal();
            await loadDefinitions();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || "Không thể lưu định nghĩa hồ sơ.");
        } finally {
            setSubmitting(false);
        }
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
                doc_two_sides: Number(row.doc_two_sides || 0),
                status: nextStatus,
            });
            setSuccessMessage(nextStatus === 1 ? "Kích hoạt hồ sơ thành công." : "Vô hiệu hóa hồ sơ thành công.");
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
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={loadDefinitions}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                            <RefreshCw className="h-4 w-4" /> Tải lại
                        </button>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                        >
                            <Plus className="h-4 w-4" /> Tạo hồ sơ
                        </button>
                    </div>
                }
            />

            <form onSubmit={handleApplyFilters} className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 xl:grid-cols-6">
                    <div>
                        <label htmlFor="filter-id" className="mb-2 block text-sm font-semibold text-slate-700">ID</label>
                        <input id="filter-id" type="text" value={filters.id} onChange={(e) => setFilters((prev) => ({ ...prev, id: e.target.value }))} placeholder="ID" className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="filter-document-id" className="mb-2 block text-sm font-semibold text-slate-700">Document ID</label>
                        <input id="filter-document-id" type="text" value={filters.document_id} onChange={(e) => setFilters((prev) => ({ ...prev, document_id: e.target.value }))} placeholder="Document ID" className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="filter-doc-user" className="mb-2 block text-sm font-semibold text-slate-700">Đối tượng</label>
                        <select id="filter-doc-user" value={filters.doc_user} onChange={(e) => setFilters((prev) => ({ ...prev, doc_user: e.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500">
                            <option value="">Tất cả</option>
                            <option value="0">Khách hàng</option>
                            <option value="1">Tài xế</option>
                            <option value="2">Chủ xe/phương tiện</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-doc-type" className="mb-2 block text-sm font-semibold text-slate-700">Loại hồ sơ</label>
                        <select id="filter-doc-type" value={filters.doc_type} onChange={(e) => setFilters((prev) => ({ ...prev, doc_type: e.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500">
                            <option value="">Tất cả</option>
                            <option value="0">Cá nhân</option>
                            <option value="1">Tài liệu phương tiện</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-status" className="mb-2 block text-sm font-semibold text-slate-700">Tình trạng</label>
                        <select id="filter-status" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500">
                            <option value="">Tất cả</option>
                            <option value="1">Đã kích hoạt</option>
                            <option value="0">Không kích hoạt</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filter-doc-city" className="mb-2 block text-sm font-semibold text-slate-700">Khu vực</label>
                        <input id="filter-doc-city" type="text" value={filters.doc_city} onChange={(e) => setFilters((prev) => ({ ...prev, doc_city: e.target.value }))} placeholder="ID thành phố" className="w-full min-h-11 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500" />
                    </div>
                </div>

                {Object.keys(filterErrors).length > 0 ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {Object.entries(filterErrors).map(([field, message]) => (
                            <p key={field} className="text-sm text-red-600">{message}</p>
                        ))}
                    </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                    <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"><Search className="h-4 w-4" />Áp dụng bộ lọc</button>
                    <button type="button" onClick={handleResetFilters} className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Đặt lại</button>
                </div>
            </form>

            {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}
            {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{successMessage}</span></div> : null}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {loading ? (
                    <div className="flex min-h-56 items-center justify-center text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang tải...</div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                        <p className="text-sm text-slate-500">Không tìm thấy hồ sơ nào.</p>
                        <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
                            <Plus className="h-4 w-4" /> Tạo hồ sơ đầu tiên
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Tiêu đề</th>
                                    <th className="px-4 py-3">Đối tượng</th>
                                    <th className="px-4 py-3">Thành phố</th>
                                    <th className="px-4 py-3">Yêu cầu</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => {
                                    const target = getTargetByDocumentType(row);
                                    const targetLabel = target?.label || `doc_user=${row.doc_user}, doc_type=${row.doc_type}`;
                                    const isActive = Number(row.status) === 1;

                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50/80">
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">#{row.id}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                <p className="font-semibold text-slate-900">{row.title}</p>
                                                <p className="line-clamp-2 text-xs text-slate-500">{row.doc_desc}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                <p>{targetLabel}</p>
                                                <p className="text-xs text-slate-500">doc_user={row.doc_user}, doc_type={row.doc_type}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{row.doc_city ?? "ALL"}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 space-y-0.5">
                                                <p className="flex items-center gap-1">Thời hạn: {Number(row.doc_expiry || 0) === 1 ? <Check className="text-green-500 w-4 h-4" /> : <X className="text-red-400 w-4 h-4" />}</p>
                                                <p className="flex items-center gap-1">Số giấy tờ: {Number(row.doc_id_num || 0) === 1 ? <Check className="text-green-500 w-4 h-4" /> : <X className="text-red-400 w-4 h-4" />}</p>
                                                <p className="flex items-center gap-1">Hai mặt: {Number(row.doc_two_sides || 0) === 1 ? <Check className="text-green-500 w-4 h-4" /> : <X className="text-red-400 w-4 h-4" />}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "text-emerald-700" : "text-red-700"}`}>
                                                    {isActive ? <ShieldCheck /> : <ShieldX />}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(row)}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" /> Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={togglingId === Number(row.id)}
                                                        onClick={() => handleToggleStatus(row)}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                                                    >
                                                        {togglingId === Number(row.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePenLine className="h-3.5 w-3.5" />}
                                                        {isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                                                    </button>
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

            {modalOpen ? (
                <DocumentFormModal
                    editingId={editingId}
                    form={form}
                    formErrors={formErrors}
                    submitting={submitting}
                    onChangeForm={handleChangeForm}
                    onSubmit={handleSubmitForm}
                    onClose={closeModal}
                />
            ) : null}
        </div>
    );
}
