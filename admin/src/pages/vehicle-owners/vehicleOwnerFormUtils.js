export const OWNER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const OWNER_PHONE_REGEX = /^\+?[0-9]{8,20}$/;

export const OWNER_VERIFICATION_OPTIONS = [
    { value: "", label: "Tất cả trạng thái xác minh" },
    { value: "not_submitted", label: "Chưa gửi hồ sơ" },
    { value: "pending_review", label: "Đang chờ duyệt" },
    { value: "verified", label: "Đã xác minh" },
    { value: "rejected", label: "Bị từ chối" },
];

export const OWNER_ACCOUNT_ACTIVE_OPTIONS = [
    { value: "", label: "Tất cả trạng thái tài khoản" },
    { value: "1", label: "Đang hoạt động" },
    { value: "0", label: "Đang khóa" },
];

export const OWNER_ACTIVATION_OPTIONS = [
    { value: "", label: "Tất cả kích hoạt" },
    { value: "1", label: "Đã kích hoạt" },
    { value: "0", label: "Chưa kích hoạt" },
];

export const OWNER_SORT_OPTIONS = [
    { value: "date_created", label: "Ngày tạo" },
    { value: "fullname", label: "Tên chủ xe" },
    { value: "owner_id", label: "Mã chủ xe" },
    { value: "commission_rate", label: "Hoa hồng" },
];

export const OWNER_LIST_LIMIT_OPTIONS = ["10", "20", "50", "100"];

export const defaultVehicleOwnerFilters = {
    search: "",
    verification_status: "",
    account_active: "",
    is_activated: "",
    date_from: "",
    date_to: "",
    sort_by: "date_created",
    sort_order: "DESC",
    limit: "10",
};

export const defaultVehicleOwnerForm = {
    fullname: "",
    phone: "",
    email: "",
    address: "",
    bank_name: "",
    bank_account: "",
    bank_code: "",
    swift_code: "",
    verification_status: "not_submitted",
    commission_rate: "",
    account_active: "1",
    is_activated: "1",
    status: "1",
    password: "",
};

export function validateVehicleOwnerFilters(filters) {
    const errors = {};
    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
        errors.date_range = "Ngày bắt đầu không được lớn hơn ngày kết thúc.";
    }
    return errors;
}

export function validateVehicleOwnerForm(form, { requirePassword = false } = {}) {
    const errors = {};

    if (!String(form.fullname || "").trim() || String(form.fullname || "").trim().length > 100) {
        errors.fullname = "Họ tên là bắt buộc và không được vượt quá 100 ký tự.";
    }

    if (!OWNER_PHONE_REGEX.test(String(form.phone || "").trim())) {
        errors.phone = "Số điện thoại phải có 8-20 chữ số và có thể bắt đầu bằng +.";
    }

    if (String(form.email || "").trim()) {
        const email = String(form.email || "").trim();
        if (email.length > 64 || !OWNER_EMAIL_REGEX.test(email)) {
            errors.email = "Email không đúng định dạng hoặc vượt quá 64 ký tự.";
        }
    }

    if (String(form.address || "").trim().length > 255) {
        errors.address = "Địa chỉ không được vượt quá 255 ký tự.";
    }

    if (String(form.bank_name || "").trim().length > 100) {
        errors.bank_name = "Tên ngân hàng không được vượt quá 100 ký tự.";
    }

    if (String(form.bank_account || "").trim().length > 40) {
        errors.bank_account = "Số tài khoản không được vượt quá 40 ký tự.";
    }

    if (String(form.bank_code || "").trim().length > 15) {
        errors.bank_code = "Mã ngân hàng không được vượt quá 15 ký tự.";
    }

    if (String(form.swift_code || "").trim().length > 15) {
        errors.swift_code = "Swift code không được vượt quá 15 ký tự.";
    }

    const commissionRate = Number(form.commission_rate);
    if (
        form.commission_rate !== "" &&
        (Number.isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100)
    ) {
        errors.commission_rate = "Tỷ lệ hoa hồng phải từ 0 đến 100%.";
    }

    if (!["not_submitted", "pending_review", "verified", "rejected"].includes(String(form.verification_status || ""))) {
        errors.verification_status = "Trạng thái xác minh không hợp lệ.";
    }

    if (!["0", "1"].includes(String(form.account_active || ""))) {
        errors.account_active = "Trạng thái tài khoản không hợp lệ.";
    }

    if (!["0", "1"].includes(String(form.is_activated || ""))) {
        errors.is_activated = "Trạng thái kích hoạt không hợp lệ.";
    }

    if (!["0", "1"].includes(String(form.status || ""))) {
        errors.status = "Trạng thái tổng không hợp lệ.";
    }

    if (requirePassword && String(form.password || "").trim().length > 0 && String(form.password || "").trim().length < 10) {
        errors.password = "Mật khẩu nếu nhập phải có tối thiểu 10 ký tự.";
    }

    return errors;
}

export function mapApiValidationErrors(details = []) {
    const mappedErrors = {};

    details.forEach((item) => {
        const field = item?.path;
        const message = item?.msg;

        if (field && message && !mappedErrors[field]) {
            mappedErrors[field] = message;
        }
    });

    return mappedErrors;
}

export function buildVehicleOwnerCreateInitialForm() {
    return { ...defaultVehicleOwnerForm };
}

export function buildVehicleOwnerEditForm(owner) {
    return {
        ...defaultVehicleOwnerForm,
        fullname: owner?.fullname || "",
        phone: owner?.phone || "",
        email: owner?.email || "",
        address: owner?.address || "",
        bank_name: owner?.bank_name || "",
        bank_account: owner?.bank_account || "",
        bank_code: owner?.bank_code || "",
        swift_code: owner?.swift_code || "",
        verification_status: owner?.verification_status || "not_submitted",
        commission_rate:
            owner?.commission_rate === undefined || owner?.commission_rate === null
                ? ""
                : String(owner.commission_rate),
        account_active: String(Number(owner?.account_active) === 1 ? 1 : 0),
        is_activated: String(Number(owner?.is_activated) === 1 ? 1 : 0),
        status: String(Number(owner?.status) === 1 ? 1 : 0),
        password: "",
    };
}

export function buildVehicleOwnerPayload(form, { includePassword = false } = {}) {
    const payload = {
        fullname: String(form.fullname || "").trim(),
        phone: String(form.phone || "").trim(),
        email: String(form.email || "").trim() || null,
        address: String(form.address || "").trim() || null,
        bank_name: String(form.bank_name || "").trim() || null,
        bank_account: String(form.bank_account || "").trim() || null,
        bank_code: String(form.bank_code || "").trim() || null,
        swift_code: String(form.swift_code || "").trim() || null,
        verification_status: String(form.verification_status || "not_submitted"),
        commission_rate:
            form.commission_rate === "" || form.commission_rate === null || form.commission_rate === undefined
                ? 0
                : Number(form.commission_rate),
        account_active: Number(form.account_active),
        is_activated: Number(form.is_activated),
        status: Number(form.status),
    };

    if (includePassword && String(form.password || "").trim()) {
        payload.password = String(form.password).trim();
    }

    return payload;
}

export function buildVehicleOwnerQueryParams(filters, page) {
    return {
        page,
        limit: Number(filters.limit) || 10,
        verification_status: filters.verification_status || undefined,
        account_active: filters.account_active || undefined,
        is_activated: filters.is_activated || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        search: String(filters.search || "").trim() || undefined,
        sort_by: filters.sort_by || undefined,
        sort_order: filters.sort_order || undefined,
    };
}

export function formatVehicleOwnerAccountStatus(value) {
    return Number(value) === 1
        ? { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700" }
        : { label: "Đang khóa", className: "bg-rose-100 text-rose-700" };
}

export function formatVehicleOwnerActivationStatus(value) {
    return Number(value) === 1
        ? { label: "Đã kích hoạt", className: "bg-cyan-100 text-cyan-700" }
        : { label: "Chưa kích hoạt", className: "bg-amber-100 text-amber-700" };
}

export function formatVehicleOwnerVerificationStatus(value) {
    const map = {
        not_submitted: { label: "Chưa gửi hồ sơ", className: "bg-slate-200 text-slate-700" },
        pending_review: { label: "Đang chờ duyệt", className: "bg-amber-100 text-amber-700" },
        verified: { label: "Đã xác minh", className: "bg-emerald-100 text-emerald-700" },
        rejected: { label: "Bị từ chối", className: "bg-rose-100 text-rose-700" },
    };

    return map[value] || map.not_submitted;
}

