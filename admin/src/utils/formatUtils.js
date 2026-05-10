export const formatCurrency = (value) => {
    if (typeof value !== "number") return value;
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
};