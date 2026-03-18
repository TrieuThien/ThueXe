import { findCountryByCode } from "../../data/countries";

export const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const internationalPhoneRegex = /^\+\d{8,15}$/;
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

export const STAFF_ROLES = [
    { value: "biller", label: "Biller" },
    { value: "dispatcher", label: "Dispatcher" },
    { value: "admin", label: "Admin" },
];

export const defaultStaffFilters = {
    route_id: "",
    active_today: "",
    rating_min: "",
    rating_max: "",
    date_from: "",
    date_to: "",
    search: "",
    sort_by: "account_create_date",
    sort_order: "DESC",
    limit: "10",
};

export const STAFF_SORT_OPTIONS = [
    { value: "account_create_date", label: "Ngày tạo" },
    { value: "firstname", label: "Tên" },
    { value: "user_rating", label: "Đánh giá" },
    { value: "wallet_amount", label: "Ví" },
    { value: "user_id", label: "Mã nhân viên" },
];

export function sanitizePhoneDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

export function normalizeNationalPhoneNumber(rawPhone, country) {
    let digits = sanitizePhoneDigits(rawPhone);
    const dialDigits = sanitizePhoneDigits(country?.dialCode || "");

    if (!digits) {
        return "";
    }

    if (dialDigits && digits.startsWith(dialDigits)) {
        digits = digits.slice(dialDigits.length);
    }

    if (digits.startsWith("0")) {
        digits = digits.replace(/^0+/, "");
    }

    return digits;
}

export function buildInternationalPhoneNumber(rawPhone, country) {
    const nationalNumber = normalizeNationalPhoneNumber(rawPhone, country);
    return nationalNumber ? `${country.dialCode}${nationalNumber}` : "";
}

export function validateStaffImageFile(imageFile) {
    if (!imageFile) {
        return "";
    }

    if (!allowedImageTypes.includes(imageFile.type)) {
        return "Anh phai la jpeg, png, webp hoac gif.";
    }

    if (imageFile.size > 2 * 1024 * 1024) {
        return "Dung luong anh khong duoc vuot qua 2MB.";
    }

    return "";
}

export function validateStaffForm(form, options = {}) {
    const { requirePassword = false } = options;
    const errors = {};
    const firstname = String(form.firstname || "").trim();
    const lastname = String(form.lastname || "").trim();
    const routeId = String(form.route_id || "").trim();
    const selectedCountry = findCountryByCode(form.country_code);
    const phone = normalizeNationalPhoneNumber(form.phone, selectedCountry);
    const fullPhone = buildInternationalPhoneNumber(form.phone, selectedCountry);
    const email = String(form.email || "").trim();
    const imageError = validateStaffImageFile(form.photo_file);

    if (firstname.length < 2 || firstname.length > 64) {
        errors.firstname = "Họ phải có từ 2 đến 64 ký tự.";
    }

    if (lastname.length < 2 || lastname.length > 64) {
        errors.lastname = "Tên phải có từ 2 đến 64 ký tự.";
    }

    if (!routeId) {
        errors.route_id = "Vui lòng chọn thành phố phụ trách.";
    }

    if (!selectedCountry) {
        errors.country_code = "Vui lòng chọn quốc gia.";
    }

    if (phone.length < 4 || phone.length > 14 || !internationalPhoneRegex.test(fullPhone)) {
        errors.phone = "Số điện thoại không hợp lệ.";
    }

    if (!email) {
        errors.email = "Email là bắt buộc.";
    } else if (email.length > 64 || !emailRegex.test(email)) {
        errors.email = "Email không đúng định dạng hoặc vượt quá 64 ký tự.";
    }

    if (!STAFF_ROLES.some((item) => item.value === form.role)) {
        errors.role = "Vai trò không hợp lệ.";
    }

    if (String(form.address || "").trim().length > 255) {
        errors.address = "Địa chỉ không được vượt quá 255 ký tự.";
    }

    if (!["0", "1"].includes(String(form.account_active ?? "1"))) {
        errors.account_active = "Trạng thái tài khoản không hợp lệ.";
    }

    if (requirePassword && !passwordRegex.test(String(form.password || ""))) {
        errors.password = "Mật khẩu phải có 10-128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
    }

    if (imageError) {
        errors.photo_file = imageError;
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

export function validateAdminPasswordConfirm(password) {
    const normalizedPassword = String(password || "");

    if (!passwordRegex.test(normalizedPassword)) {
        return "Mat khau admin khong hop le.";
    }

    return "";
}

export function buildStaffFormData(form, { includePassword = false } = {}) {
    const formData = new FormData();
    const selectedCountry = findCountryByCode(form.country_code);
    const fullPhone = buildInternationalPhoneNumber(form.phone, selectedCountry);

    if (form.photo_file) {
        formData.append("photo_file", form.photo_file);
    }

    formData.append("firstname", String(form.firstname || "").trim());
    formData.append("lastname", String(form.lastname || "").trim());
    formData.append("route_id", String(form.route_id || "").trim());
    formData.append("account_active", String(form.account_active ?? "1"));
    formData.append("phone", fullPhone);
    formData.append("country", selectedCountry.name);
    formData.append("country_code", selectedCountry.code);
    formData.append("country_dial_code", selectedCountry.dialCode);
    formData.append("email", String(form.email || "").trim());
    formData.append("address", String(form.address || "").trim());
    formData.append("role", String(form.role || "dispatcher"));

    if (includePassword) {
        formData.append("password", String(form.password || ""));
    }

    return formData;
}

export function buildStaffQueryParams(filters, page) {
    return {
        page,
        limit: Number(filters.limit) || 10,
        route_id: filters.route_id || undefined,
        active_today: filters.active_today || undefined,
        rating_min: filters.rating_min || undefined,
        rating_max: filters.rating_max || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        search: String(filters.search || "").trim() || undefined,
        sort_by: filters.sort_by || undefined,
        sort_order: filters.sort_order || undefined,
    };
}

export function validateStaffFilters(filters) {
    const errors = {};
    const ratingMin = filters.rating_min === "" ? null : Number(filters.rating_min);
    const ratingMax = filters.rating_max === "" ? null : Number(filters.rating_max);

    if (filters.rating_min !== "" && (Number.isNaN(ratingMin) || ratingMin < 0 || ratingMin > 5)) {
        errors.rating_min = "Đánh giá tối thiểu phải từ 0 đến 5.";
    }

    if (filters.rating_max !== "" && (Number.isNaN(ratingMax) || ratingMax < 0 || ratingMax > 5)) {
        errors.rating_max = "Đánh giá tối đa phải từ 0 đến 5.";
    }

    if (ratingMin !== null && ratingMax !== null && ratingMin > ratingMax) {
        errors.rating_range = "Đánh giá tối thiểu không được lớn hơn đánh giá tối đa.";
    }

    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
        errors.date_range = "Ngày bắt đầu không được lớn hơn ngày kết thúc.";
    }

    return errors;
}
