import { findCountryByCode } from "../../data/countries";

export const DRIVER_ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

export const DRIVER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DRIVER_INTERNATIONAL_PHONE_REGEX = /^\+\d{8,15}$/;
export const DRIVER_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

export const DRIVER_DOCUMENT_STATUS_OPTIONS = [
    { value: "", label: "Tất cả hồ sơ" },
    { value: "no_documents", label: "Chưa có hồ sơ" },
    { value: "pending", label: "Đang chờ duyệt" },
    { value: "failed", label: "Không đạt" },
    { value: "expired", label: "Hết hạn" },
    { value: "approved", label: "Đã duyệt" },
];

export const DRIVER_COLOR_OPTIONS = [
    { label: "Đen", value: "black" },
    { label: "Nâu", value: "brown" },
    { label: "Đỏ", value: "red" },
    { label: "Cam", value: "orange" },
    { label: "Vàng", value: "yellow" },
    { label: "Xanh lá", value: "green" },
    { label: "Xanh dương", value: "blue" },
    { label: "Xanh da trời", value: "sky-blue" },
    { label: "Hồng", value: "pink" },
    { label: "Tím", value: "purple" },
    { label: "Xám", value: "grey" },
    { label: "Trắng", value: "white" },
    { label: "Vàng kim", value: "gold" },
    { label: "Bạc", value: "silver" },
];

export const DRIVER_SORT_OPTIONS = [
    { value: "account_create_date", label: "Ngày tạo" },
    { value: "firstname", label: "Tên" },
    { value: "driver_rating", label: "Đánh giá" },
    { value: "wallet_amount", label: "Ví" },
    { value: "driver_id", label: "Mã tài xế" },
];

export const DRIVER_ACTIVATION_OPTIONS = [
    { value: "", label: "Tất cả kích hoạt" },
    { value: "1", label: "Đã kích hoạt" },
    { value: "0", label: "Chưa kích hoạt" },
];

export const DRIVER_ONLINE_OPTIONS = [
    { value: "", label: "Tất cả trạng thái online" },
    { value: "1", label: "Đang online" },
    { value: "0", label: "Đang offline" },
];

export const DRIVER_STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái tài khoản" },
    { value: "1", label: "Đang hoạt động" },
    { value: "0", label: "Đang khóa" },
];

export const DRIVER_LIST_LIMIT_OPTIONS = ["10", "20", "50", "100"];
const DRIVER_PRESET_BANK_MAP = new Map([
    ["VIETCOMBANK", "Vietcombank"],
    ["VIETINBANK", "VietinBank"],
    ["BIDV", "BIDV"],
    ["AGRIBANK", "Agribank"],
    ["TECHCOMBANK", "Techcombank"],
    ["MB BANK", "MB Bank"],
    ["ACB", "ACB"],
    ["VPBANK", "VPBank"],
    ["TPBANK", "TPBank"],
    ["SACOMBANK", "Sacombank"],
    ["SHB", "SHB"],
    ["HDBANK", "HDBank"],
    ["VIB", "VIB"],
    ["OCB", "OCB"],
    ["SEABANK", "SeABank"],
    ["MSB", "MSB"],
    ["EXIMBANK", "Eximbank"],
    ["PVCOMBANK", "PVcomBank"],
    ["NAM A BANK", "Nam A Bank"],
    ["SCB", "SCB"],
]);

export const defaultDriverForm = {
    photo_file: null,
    firstname: "",
    lastname: "",
    drv_address: "",
    reg_route_id: "",
    country_code: "vn",
    phone: "",
    email: "",
    activation_pin: "",
    password: "",
    car_plate_num: "",
    car_reg_num: "",
    car_model: "",
    ride_id: "",
    car_year: "",
    car_color: "",
    bank_acc_holder_name: "",
    bank_acc_num: "",
    bank_name: "",
    bank_name_custom: "",
    bank_code: "",
    bank_swift_code: "",
    driver_commision: "",
    account_active: "0",
    is_activated: "0",
    available: "0",
};

export const defaultDriverFilters = {
    reg_route_id: "",
    ride_id: "",
    is_activated: "",
    available: "",
    date_from: "",
    date_to: "",
    rating_min: "",
    rating_max: "",
    document_status: "",
    search: "",
    sort_by: "account_create_date",
    sort_order: "DESC",
    limit: "10",
};

export function sanitizePhoneDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

function normalizeDriverNameForComparison(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleUpperCase("vi-VN");
}

function buildDriverFullName(firstname, lastname) {
    return [String(firstname || "").trim(), String(lastname || "").trim()].filter(Boolean).join(" ");
}

function toCapitalizedValue(value) {
    return String(value || "")
        .trim()
        .toLocaleLowerCase("vi-VN")
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toLocaleUpperCase("vi-VN") + word.slice(1))
        .join(" ");
}

function toUppercaseValue(value) {
    return String(value || "").trim().toLocaleUpperCase("vi-VN");
}

function normalizePresetBankValue(value) {
    const normalized = String(value || "").trim();
    if (!normalized) return "";

    return DRIVER_PRESET_BANK_MAP.get(normalized.toLocaleUpperCase("vi-VN")) || "";
}

export function normalizeNationalPhoneNumber(rawPhone, country) {
    let digits = sanitizePhoneDigits(rawPhone);
    const dialDigits = sanitizePhoneDigits(country?.dialCode || "");

    if (!digits) return "";

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

export function validateDriverImageFile(imageFile, { required = false } = {}) {
    if (!imageFile) {
        return required ? "Ảnh đại diện là bắt buộc." : "";
    }

    if (!DRIVER_ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return "Ảnh phải là jpeg, png, webp hoặc gif.";
    }

    if (imageFile.size > 2 * 1024 * 1024) {
        return "Dung lượng ảnh không được vượt quá 2MB.";
    }

    return "";
}

function isStrongPassword(value) {
    return DRIVER_PASSWORD_REGEX.test(String(value || ""));
}

function validateCommonDriverForm(form, options = {}) {
    const {
        requireImage = false,
        requirePassword = false,
        requireActivationPin = false,
        requireStatuses = false,
    } = options;

    const errors = {};
    const selectedCountry = findCountryByCode(form.country_code);
    const fullPhone = buildInternationalPhoneNumber(form.phone, selectedCountry);
    const imageError = validateDriverImageFile(form.photo_file, { required: requireImage });
    const carColorValues = new Set(DRIVER_COLOR_OPTIONS.map((item) => item.value));
    const commission = Number(form.driver_commision);

    if (!String(form.firstname || "").trim() || String(form.firstname || "").trim().length > 64) {
        errors.firstname = "Họ là bắt buộc và không được vượt quá 64 ký tự.";
    }

    if (!String(form.lastname || "").trim() || String(form.lastname || "").trim().length > 64) {
        errors.lastname = "Tên là bắt buộc và không được vượt quá 64 ký tự.";
    }

    if (!String(form.drv_address || "").trim() || String(form.drv_address || "").trim().length > 255) {
        errors.drv_address = "Địa chỉ là bắt buộc và không được vượt quá 255 ký tự.";
    }

    if (!String(form.reg_route_id || "").trim()) {
        errors.reg_route_id = "Vui lòng chọn thành phố hoạt động.";
    }

    if (!selectedCountry) {
        errors.country_code = "Vui lòng chọn quốc gia.";
    }

    if (!DRIVER_INTERNATIONAL_PHONE_REGEX.test(fullPhone)) {
        errors.phone = "Số điện thoại không hợp lệ theo chuẩn E.164.";
    }

    if (!String(form.email || "").trim()) {
        errors.email = "Email là bắt buộc.";
    } else if (
        String(form.email || "").trim().length > 64 ||
        !DRIVER_EMAIL_REGEX.test(String(form.email || "").trim())
    ) {
        errors.email = "Email không đúng định dạng hoặc vượt quá 64 ký tự.";
    }

    if (requireActivationPin && !String(form.activation_pin || "").trim()) {
        errors.activation_pin = "Mã kích hoạt là bắt buộc.";
    }

    if (requirePassword && !isStrongPassword(form.password)) {
        errors.password =
            "Mật khẩu phải có 10-128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
    }

    if (!String(form.car_plate_num || "").trim() || String(form.car_plate_num || "").trim().length > 20) {
        errors.car_plate_num = "Biển số xe là bắt buộc và không được vượt quá 20 ký tự.";
    }

    if (String(form.car_reg_num || "").trim().length > 30) {
        errors.car_reg_num = "Số đăng ký xe không được vượt quá 30 ký tự.";
    }

    if (!String(form.car_model || "").trim() || String(form.car_model || "").trim().length > 64) {
        errors.car_model = "Dòng xe là bắt buộc và không được vượt quá 64 ký tự.";
    }

    if (!String(form.ride_id || "").trim()) {
        errors.ride_id = "Vui lòng chọn loại xe.";
    }

    const carYear = Number(form.car_year);
    if (!Number.isInteger(carYear) || carYear < 1990 || carYear > 2040) {
        errors.car_year = "Năm xe phải nằm trong khoảng 1990-2040.";
    }

    if (!carColorValues.has(String(form.car_color || "").trim())) {
        errors.car_color = "Vui lòng chọn màu xe hợp lệ.";
    }

    if (
        !String(form.bank_acc_holder_name || "").trim() ||
        String(form.bank_acc_holder_name || "").trim().length > 100
    ) {
        errors.bank_acc_holder_name = "Tên chủ tài khoản là bắt buộc và không được vượt quá 100 ký tự.";
    }

    if (
        !String(form.bank_acc_num || "").trim() ||
        String(form.bank_acc_num || "").trim().length > 40
    ) {
        errors.bank_acc_num = "Số tài khoản là bắt buộc và không được vượt quá 40 ký tự.";
    }

    if (!String(form.bank_name || "").trim() || String(form.bank_name || "").trim().length > 100) {
        errors.bank_name = "Vui lòng chọn ngân hàng.";
    }

    if (String(form.bank_name || "").trim() === "other") {
        if (
            !String(form.bank_name_custom || "").trim() ||
            String(form.bank_name_custom || "").trim().length > 100
        ) {
            errors.bank_name_custom =
                "Tên ngân hàng tùy chỉnh là bắt buộc và không được vượt quá 100 ký tự.";
        }

        if (!String(form.bank_code || "").trim() || String(form.bank_code || "").trim().length > 15) {
            errors.bank_code = "Mã ngân hàng là bắt buộc và không được vượt quá 15 ký tự.";
        }
    } else if (String(form.bank_code || "").trim().length > 15) {
        errors.bank_code = "Mã ngân hàng không được vượt quá 15 ký tự.";
    }

    if (String(form.bank_swift_code || "").trim().length > 15) {
        errors.bank_swift_code = "Swift code không được vượt quá 15 ký tự.";
    }

    if (!errors.bank_acc_holder_name) {
        const driverFullName = normalizeDriverNameForComparison(buildDriverFullName(form.firstname, form.lastname));
        const bankAccountHolderName = normalizeDriverNameForComparison(form.bank_acc_holder_name);

        if (driverFullName !== bankAccountHolderName) {
            errors.bank_acc_holder_name = "Tên chủ tài khoản phải trùng với họ và tên tài xế.";
        }
    }

    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
        errors.driver_commision = "Tỷ lệ hoa hồng phải từ 0 đến 100%.";
    }

    if (imageError) {
        errors.photo_file = imageError;
    }

    if (requireStatuses) {
        if (!["0", "1"].includes(String(form.account_active ?? "").trim())) {
            errors.account_active = "Trạng thái tài khoản không hợp lệ.";
        }
        if (!["0", "1"].includes(String(form.is_activated ?? "").trim())) {
            errors.is_activated = "Trạng thái kích hoạt không hợp lệ.";
        }
        if (!["0", "1"].includes(String(form.available ?? "").trim())) {
            errors.available = "Trạng thái online không hợp lệ.";
        }
    }

    return errors;
}

export function validateNewDriverForm(form) {
    return validateCommonDriverForm(form, {
        requireImage: true,
        requirePassword: true,
        requireActivationPin: false,
        requireStatuses: false,
    });
}

export function validateEditDriverForm(form) {
    return validateCommonDriverForm(form, {
        requireImage: false,
        requirePassword: false,
        requireActivationPin: false,
        requireStatuses: true,
    });
}

export function validateDriverFilters(filters) {
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

export function buildDriverFormData(form, { includePassword = false, includeActivationPin = false } = {}) {
    const formData = new FormData();
    const selectedCountry = findCountryByCode(form.country_code);
    const fullPhone = buildInternationalPhoneNumber(form.phone, selectedCountry);
    const bankName = form.bank_name === "other" ? "other" : form.bank_name;

    if (form.photo_file) {
        formData.append("photo_file", form.photo_file);
    }

    formData.append("firstname", toCapitalizedValue(form.firstname));
    formData.append("lastname", toCapitalizedValue(form.lastname));
    formData.append("drv_address", String(form.drv_address || "").trim());
    formData.append("reg_route_id", String(form.reg_route_id || "").trim());
    formData.append("country_code", selectedCountry.code);
    formData.append("country_dial_code", selectedCountry.dialCode);
    formData.append("phone", fullPhone);
    formData.append("email", String(form.email || "").trim());
    formData.append("car_plate_num", String(form.car_plate_num || "").trim());
    formData.append("car_reg_num", String(form.car_reg_num || "").trim());
    formData.append("car_model", String(form.car_model || "").trim());
    formData.append("ride_id", String(form.ride_id || "").trim());
    formData.append("car_year", String(form.car_year || "").trim());
    formData.append("car_color", String(form.car_color || "").trim());
    formData.append("bank_acc_holder_name", toUppercaseValue(form.bank_acc_holder_name));
    formData.append("bank_acc_num", String(form.bank_acc_num || "").trim());
    formData.append("bank_name", bankName);
    formData.append("bank_name_custom", String(form.bank_name_custom || "").trim());
    formData.append("bank_code", String(form.bank_code || "").trim());
    formData.append("bank_swift_code", String(form.bank_swift_code || "").trim());
    formData.append("driver_commision", String(form.driver_commision || "").trim());

    if (includeActivationPin && String(form.activation_pin || "").trim()) {
        formData.append("activation_pin", String(form.activation_pin || "").trim());
    }

    if (includePassword) {
        formData.append("password", String(form.password || ""));
    }

    if (form.account_active !== undefined) {
        formData.append("account_active", String(form.account_active));
    }

    if (form.is_activated !== undefined) {
        formData.append("is_activated", String(form.is_activated));
    }

    if (form.available !== undefined) {
        formData.append("available", String(form.available));
    }

    return formData;
}

export function buildDriverCreateInitialForm() {
    return { ...defaultDriverForm };
}

export function buildDriverEditForm(driver) {
    const country = findCountryByCode(driver?.country_code || "vn");
    const normalizedBankName = String(driver?.bank_name || "").trim();
    const presetBankValue = normalizePresetBankValue(normalizedBankName);
    const usesCustomBank = normalizedBankName && !presetBankValue;

    return {
        ...defaultDriverForm,
        firstname: driver?.firstname || "",
        lastname: driver?.lastname || "",
        drv_address: driver?.drv_address || "",
        reg_route_id: driver?.reg_route_id ? String(driver.reg_route_id) : "",
        country_code: country.code,
        phone: normalizeNationalPhoneNumber(driver?.phone, country),
        email: driver?.email || "",
        activation_pin: "",
        password: "",
        car_plate_num: driver?.car_plate_num || "",
        car_reg_num: driver?.car_reg_num || "",
        car_model: driver?.car_model || "",
        ride_id: driver?.ride_id ? String(driver.ride_id) : "",
        car_year: driver?.car_year ? String(driver.car_year) : "",
        car_color: driver?.car_color_code || driver?.car_color || "",
        bank_acc_holder_name: driver?.bank_acc_holder_name || "",
        bank_acc_num: driver?.bank_acc_num || "",
        bank_name: usesCustomBank ? "other" : presetBankValue,
        bank_name_custom: usesCustomBank ? normalizedBankName : "",
        bank_code: driver?.bank_code || "",
        bank_swift_code: driver?.bank_swift_code || "",
        driver_commision:
            driver?.driver_commision === undefined || driver?.driver_commision === null
                ? ""
                : String(driver.driver_commision),
        account_active: String(Number(driver?.account_active) === 1 ? 1 : 0),
        is_activated: String(Number(driver?.is_activated) === 1 ? 1 : 0),
        available: String(Number(driver?.available) === 1 ? 1 : 0),
        photo_file: null,
    };
}

export function buildDriverQueryParams(filters, page) {
    return {
        page,
        limit: Number(filters.limit) || 10,
        reg_route_id: filters.reg_route_id || undefined,
        ride_id: filters.ride_id || undefined,
        is_activated: filters.is_activated || undefined,
        available: filters.available || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        rating_min: filters.rating_min || undefined,
        rating_max: filters.rating_max || undefined,
        document_status: filters.document_status || undefined,
        search: String(filters.search || "").trim() || undefined,
        sort_by: filters.sort_by || undefined,
        sort_order: filters.sort_order || undefined,
    };
}

export function formatDriverDocumentStatus(value) {
    const map = {
        no_documents: { label: "Chưa có hồ sơ", className: "bg-slate-200 text-slate-700" },
        pending: { label: "Đang chờ duyệt", className: "bg-amber-100 text-amber-700" },
        failed: { label: "Không đạt", className: "bg-rose-100 text-rose-700" },
        expired: { label: "Hết hạn", className: "bg-orange-100 text-orange-700" },
        approved: { label: "Đã duyệt", className: "bg-emerald-100 text-emerald-700" },
    };

    return map[value] || map.no_documents;
}

export function formatDriverAvailability(value) {
    return Number(value) === 1
        ? { label: "Online", className: "bg-emerald-100 text-emerald-700" }
        : { label: "Offline", className: "bg-slate-200 text-slate-700" };
}

export function formatDriverAccountStatus(value) {
    return Number(value) === 1
        ? { label: "Đang hoạt động", className: "bg-emerald-100 text-emerald-700" }
        : { label: "Đang khóa", className: "bg-rose-100 text-rose-700" };
}

export function formatDriverActivationStatus(value) {
    return Number(value) === 1
        ? { label: "Đã kích hoạt", className: "bg-cyan-100 text-cyan-700" }
        : { label: "Chưa kích hoạt", className: "bg-amber-100 text-amber-700" };
}
