import { findCountryByCode } from "../../data/countries";

export const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const internationalPhoneRegex = /^\+\d{8,15}$/;

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

export function validateCustomerImageFile(imageFile) {
    if (!imageFile) {
        return "";
    }

    if (!allowedImageTypes.includes(imageFile.type)) {
        return "Ảnh phải là jpeg, png, webp hoặc gif.";
    }

    if (imageFile.size > 2 * 1024 * 1024) {
        return "Dung lượng ảnh không được vượt quá 2MB.";
    }

    return "";
}

export function validateCustomerPersonalForm(form, options = {}) {
    const { requireRoute = true } = options;
    const errors = {};
    const firstname = form.firstname.trim();
    const lastname = form.lastname.trim();
    const routeId = String(form.route_id || "").trim();
    const accountActive = String(form.account_active ?? "").trim();
    const isActivated = String(form.is_activated ?? "").trim();
    const selectedCountry = findCountryByCode(form.country_code);
    const phone = normalizeNationalPhoneNumber(form.phone, selectedCountry);
    const fullPhone = buildInternationalPhoneNumber(form.phone, selectedCountry);
    const email = form.email.trim();
    const imageError = validateCustomerImageFile(form.photo_file);

    if (firstname.length < 2 || firstname.length > 64) {
        errors.firstname = "Họ phải có từ 2 đến 64 ký tự.";
    }

    if (lastname.length < 2 || lastname.length > 64) {
        errors.lastname = "Tên phải có từ 2 đến 64 ký tự.";
    }

    if (requireRoute && !routeId) {
        errors.route_id = "Vui lòng chọn khu vực hoặc thành phố.";
    }

    if (!["0", "1"].includes(accountActive)) {
        errors.account_active = "Vui lòng chọn trạng thái tài khoản hợp lệ.";
    }

    if (!["0", "1"].includes(isActivated)) {
        errors.is_activated = "Vui lòng chọn trạng thái kích hoạt hợp lệ.";
    }

    if (!selectedCountry) {
        errors.country_code = "Vui lòng chọn quốc gia.";
    }

    if (phone.length < 4 || phone.length > 14 || !internationalPhoneRegex.test(fullPhone)) {
        errors.phone = "Số điện thoại không hợp lệ. Hãy chọn quốc gia và nhập đúng số thuê bao.";
    }

    if (!email) {
        errors.email = "Email là bắt buộc.";
    } else if (email.length > 64 || !emailRegex.test(email)) {
        errors.email = "Email không đúng định dạng hoặc vượt quá 64 ký tự.";
    }

    if (String(form.address || "").trim().length > 255) {
        errors.address = "Địa chỉ không được vượt quá 255 ký tự.";
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


