export const DISCOUNT_TYPE_OPTIONS = [
    { value: 0, label: "Giảm theo phần trăm" },
    { value: 1, label: "Giảm số tiền cố định" },
];

export const VISIBILITY_OPTIONS = [
    { value: 1, label: "Công khai (user chọn từ danh sách)" },
    { value: 0, label: "Nhập tay (không hiển thị công khai)" },
];

export const STATUS_OPTIONS = [
    { value: 1, label: "Đang hoạt động" },
    { value: 0, label: "Ngừng hoạt động" },
];

export const DEFAULT_COUPON_FORM = {
    coupon_code: "",
    coupon_title: "",
    city: "",
    vehicles: [],
    visibility: 1,
    discount_type: 0,
    discount_value: "0",
    min_fare: "0",
    max_discount_amount: "0",
    limit_count: "0",
    user_limit_count: "1",
    status: 1,
    active_date: "",
    expiry_date: "",
};

function toLocalDateTimeInput(dateValue) {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function hydrateCouponForm(coupon) {
    return {
        coupon_code: coupon?.coupon_code || "",
        coupon_title: coupon?.coupon_title || "",
        city: coupon?.city ? String(coupon.city) : "",
        vehicles: Array.isArray(coupon?.vehicle_ids) ? coupon.vehicle_ids.map((id) => Number(id)) : [],
        visibility: Number(coupon?.visibility ?? 1),
        discount_type: Number(coupon?.discount_type ?? 0),
        discount_value: String(coupon?.discount_value ?? 0),
        min_fare: String(coupon?.min_fare ?? 0),
        max_discount_amount: String(coupon?.max_discount_amount ?? 0),
        limit_count: String(coupon?.limit_count ?? 0),
        user_limit_count: String(coupon?.user_limit_count ?? 1),
        status: Number(coupon?.status ?? 1),
        active_date: toLocalDateTimeInput(coupon?.active_date),
        expiry_date: toLocalDateTimeInput(coupon?.expiry_date),
    };
}

export function validateCouponForm(form) {
    const errors = {};

    if (!String(form.coupon_code || "").trim()) {
        errors.coupon_code = "Vui lòng nhập mã giảm giá.";
    } else if (!/^[A-Za-z0-9_-]{3,15}$/.test(String(form.coupon_code || "").trim())) {
        errors.coupon_code = "Mã chỉ gồm chữ/số/_/- và dài 3-15 ký tự.";
    }

    if (!form.city) {
        errors.city = "Vui lòng chọn thành phố áp dụng.";
    }

    const discountValue = Number(form.discount_value);
    const minFare = Number(form.min_fare);
    const maxDiscount = Number(form.max_discount_amount);
    const limitCount = Number(form.limit_count);
    const userLimitCount = Number(form.user_limit_count);

    if (!Number.isFinite(discountValue) || discountValue < 0) {
        errors.discount_value = "Giá trị giảm phải là số >= 0.";
    }

    if (!Number.isFinite(minFare) || minFare < 0) {
        errors.min_fare = "Giá trị đơn tối thiểu phải là số >= 0.";
    }

    if (!Number.isFinite(maxDiscount) || maxDiscount < 0) {
        errors.max_discount_amount = "Giảm tối đa phải là số >= 0.";
    }

    if (!Number.isInteger(limitCount) || limitCount < 0) {
        errors.limit_count = "Giới hạn tổng lượt dùng phải là số nguyên >= 0.";
    }

    if (!Number.isInteger(userLimitCount) || userLimitCount < 0) {
        errors.user_limit_count = "Giới hạn mỗi người dùng phải là số nguyên >= 0.";
    }

    if (!form.active_date) {
        errors.active_date = "Vui lòng chọn ngày bắt đầu.";
    }

    if (!form.expiry_date) {
        errors.expiry_date = "Vui lòng chọn ngày hết hạn.";
    }

    if (form.active_date && form.expiry_date) {
        const activeDate = new Date(form.active_date);
        const expiryDate = new Date(form.expiry_date);

        if (expiryDate.getTime() < activeDate.getTime()) {
            errors.expiry_date = "Ngày hết hạn phải lớn hơn hoặc bằng ngày bắt đầu.";
        }
    }

    return errors;
}

export function hasCouponErrors(errors) {
    return Boolean(errors && Object.keys(errors).length);
}

export function buildCouponSubmitPayload(form) {
    return {
        coupon_code: String(form.coupon_code || "").trim().toUpperCase(),
        coupon_title: String(form.coupon_title || "").trim(),
        city: Number(form.city),
        vehicles: Array.isArray(form.vehicles)
            ? form.vehicles.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
            : [],
        visibility: Number(form.visibility),
        discount_type: Number(form.discount_type),
        discount_value: Number(form.discount_value || 0),
        min_fare: Number(form.min_fare || 0),
        max_discount_amount: Number(form.max_discount_amount || 0),
        limit_count: Number(form.limit_count || 0),
        user_limit_count: Number(form.user_limit_count || 0),
        status: Number(form.status),
        active_date: form.active_date,
        expiry_date: form.expiry_date,
    };
}

export function formatMoney(value) {
    const amount = Number(value || 0);
    return amount.toLocaleString("vi-VN");
}

export function getCouponStatusBadge(coupon) {
    return Number(coupon?.status) === 1
        ? { label: "Đang hoạt động", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
        : { label: "Ngừng hoạt động", className: "bg-slate-100 text-slate-700 border-slate-200" };
}

export function getCouponVisibilityBadge(coupon) {
    return Number(coupon?.visibility) === 1
        ? { label: "Công khai", className: "bg-blue-50 text-blue-700 border-blue-200" }
        : { label: "Nhập tay", className: "bg-amber-50 text-amber-700 border-amber-200" };
}

export function getCouponExpiryBadge(coupon) {
    const now = Date.now();
    const expiry = new Date(coupon?.expiry_date || "").getTime();
    const isExpired = Number.isFinite(expiry) && now > expiry;

    return isExpired
        ? { label: "Hết hạn", className: "bg-rose-50 text-rose-700 border-rose-200" }
        : { label: "Còn hạn", className: "bg-violet-50 text-violet-700 border-violet-200" };
}

