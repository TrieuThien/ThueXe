export const BANNER_VISIBILITY_OPTIONS = [
    { value: 0, label: "Hiển thị cho cả Rider + Driver" },
    { value: 1, label: "Chỉ hiển thị cho Rider app" },
    { value: 2, label: "Chỉ hiển thị cho Driver app" },
];

export const BANNER_STATUS_OPTIONS = [
    { value: 1, label: "Đang hiển thị" },
    { value: 0, label: "Đang ẩn" },
];

export const DEFAULT_BANNER_FORM = {
    title: "",
    excerpt: "",
    content: "",
    city: "0",
    feature_img: "",
    feature_img_file: null,
    visibility: 1,
    status: 1,
};

export function hydrateBannerForm(banner) {
    return {
        title: banner?.title || "",
        excerpt: banner?.excerpt || "",
        content: banner?.content || "",
        city: String(banner?.city ?? 0),
        feature_img: banner?.feature_img || "",
        feature_img_file: null,
        visibility: Number(banner?.visibility ?? 1),
        status: Number(banner?.status ?? 1),
    };
}

export function validateBannerImageFile(file, { required = false } = {}) {
    if (!file) {
        return required ? "Vui lòng chọn ảnh banner." : "";
    }

    const allowedTypes = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    ]);

    if (!allowedTypes.has(file.type)) {
        return "Ảnh phải là jpeg, jpg, png, webp hoặc gif.";
    }

    const maxBytes = 2 * 1024 * 1024;
    if (Number(file.size || 0) > maxBytes) {
        return "Dung lượng ảnh không được vượt quá 2MB.";
    }

    return "";
}

export function validateBannerForm(form) {
    const errors = {};

    if (!String(form.title || "").trim()) {
        errors.title = "Vui lòng nhập tiêu đề banner.";
    }

    if (!String(form.excerpt || "").trim()) {
        errors.excerpt = "Vui lòng nhập mô tả ngắn.";
    }

    if (!String(form.content || "").trim()) {
        errors.content = "Vui lòng nhập nội dung banner.";
    }

    if (!Number.isInteger(Number(form.city)) || Number(form.city) < 0) {
        errors.city = "Khu vực hiển thị không hợp lệ.";
    }

    if (String(form.feature_img || "").trim().length > 2048) {
        errors.feature_img = "feature_img tối đa 2048 ký tự.";
    }

    const imageFileError = validateBannerImageFile(form.feature_img_file);
    if (imageFileError) {
        errors.feature_img_file = imageFileError;
    }

    if (![0, 1, 2].includes(Number(form.visibility))) {
        errors.visibility = "visibility không hợp lệ.";
    }

    if (![0, 1].includes(Number(form.status))) {
        errors.status = "status không hợp lệ.";
    }

    return errors;
}

export function hasBannerErrors(errors) {
    return Boolean(errors && Object.keys(errors).length);
}

export function buildBannerSubmitFormData(form) {
    const formData = new FormData();
    formData.append("title", String(form.title || "").trim());
    formData.append("excerpt", String(form.excerpt || "").trim());
    formData.append("content", String(form.content || "").trim());
    formData.append("city", String(Number(form.city || 0)));
    formData.append("feature_img", String(form.feature_img || "").trim());
    formData.append("visibility", String(Number(form.visibility)));
    formData.append("status", String(Number(form.status)));

    if (form.feature_img_file) {
        formData.append("feature_img_file", form.feature_img_file);
    }

    return formData;
}

export function getBannerStatusBadge(banner) {
    return Number(banner?.status) === 1
        ? { label: "Đang hiển thị", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
        : { label: "Đang ẩn", className: "bg-slate-100 text-slate-700 border-slate-200" };
}

export function getBannerVisibilityBadge(banner) {
    const visibility = Number(banner?.visibility ?? 1);
    if (visibility === 0) {
        return { label: "Rider + Driver", className: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    if (visibility === 2) {
        return { label: "Driver app", className: "bg-violet-50 text-violet-700 border-violet-200" };
    }
    return { label: "Rider app", className: "bg-amber-50 text-amber-700 border-amber-200" };
}

export function formatDateTime(dateValue) {
    if (!dateValue) return "--";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString("vi-VN");
}
