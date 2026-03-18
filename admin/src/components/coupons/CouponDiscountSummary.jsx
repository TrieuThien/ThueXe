function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN");
}

export default function CouponDiscountSummary({
    originalFare = 0,
    appliedCoupon = null,
    discountAmount = 0,
    finalFare = 0,
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">Tóm tắt giảm giá</h3>

            <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-700">
                    <span>Giá gốc</span>
                    <span className="font-semibold">{formatMoney(originalFare)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                    <span>Mã áp dụng</span>
                    <span className="font-semibold">{appliedCoupon?.coupon_code || "--"}</span>
                </div>

                <div className="flex items-center justify-between text-emerald-700">
                    <span>Số tiền giảm</span>
                    <span className="font-semibold">- {formatMoney(discountAmount)}</span>
                </div>

                <div className="border-t border-slate-200 pt-2">
                    <div className="flex items-center justify-between text-base font-bold text-slate-900">
                        <span>Giá sau giảm</span>
                        <span>{formatMoney(finalFare)}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

