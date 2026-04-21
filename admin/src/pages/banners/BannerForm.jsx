import {
    BANNER_STATUS_OPTIONS,
    BANNER_VISIBILITY_OPTIONS,
} from "./bannerFormUtils";

function FieldError({ error }) {
    if (!error) return null;
    return <p className="mt-1 text-xs text-red-600">{error}</p>;
}

export default function BannerForm({
    form,
    errors,
    cities,
    submitting,
    submitLabel,
    currentImageUrl,
    selectedImagePreviewUrl,
    onChange,
    onFileChange,
    onSubmit,
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">Thông tin banner</h2>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tiêu đề</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(event) => onChange("title", event.target.value)}
                            placeholder="Ví dụ: Ưu đãi cuối tuần"
                            maxLength={255}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.title} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Mô tả ngắn</label>
                        <input
                            type="text"
                            value={form.excerpt}
                            onChange={(event) => onChange("excerpt", event.target.value)}
                            placeholder="Ví dụ: Giảm giá 20% cho chuyến đi"
                            maxLength={255}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.excerpt} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Nội dung chi tiết</label>
                        <textarea
                            value={form.content}
                            onChange={(event) => onChange("content", event.target.value)}
                            rows={5}
                            placeholder="Nội dung đầy đủ của banner..."
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                        <FieldError error={errors.content} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Khu vực hiển thị</label>
                        <select
                            value={form.city}
                            onChange={(event) => onChange("city", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            <option value="0">Toàn hệ thống</option>
                            {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                    {city.r_title}
                                </option>
                            ))}
                        </select>
                        <FieldError error={errors.city} />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ảnh banner</label>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(event) => onFileChange(event.target.files?.[0] || null)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 focus:border-blue-500"
                        />
                        <FieldError error={errors.feature_img_file} />
                        <FieldError error={errors.feature_img} />

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Ảnh hiện tại
                                </p>
                                {currentImageUrl ? (
                                    <img
                                        src={currentImageUrl}
                                        alt="Current banner"
                                        className="h-60 w-full rounded-2xl border border-slate-200 object-cover"
                                        onError={(event) => {
                                            event.currentTarget.style.display = "none";
                                        }}
                                    />
                                ) : (
                                    <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                                        Chưa có ảnh
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Ảnh vừa chọn
                                </p>
                                {selectedImagePreviewUrl ? (
                                    <img
                                        src={selectedImagePreviewUrl}
                                        alt="Selected banner"
                                        className="h-60 w-full rounded-2xl border border-blue-200 object-cover"
                                    />
                                ) : (
                                    <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                                        Chưa chọn ảnh mới
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Hiển thị</label>
                        <select
                            value={form.visibility}
                            onChange={(event) => onChange("visibility", Number(event.target.value))}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            {BANNER_VISIBILITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <FieldError error={errors.visibility} />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Trạng thái</label>
                        <select
                            value={form.status}
                            onChange={(event) => onChange("status", Number(event.target.value))}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                            {BANNER_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <FieldError error={errors.status} />
                    </div>
                </div>
            </section>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? "Đang lưu..." : submitLabel}
                </button>
            </div>
        </form>
    );
}
