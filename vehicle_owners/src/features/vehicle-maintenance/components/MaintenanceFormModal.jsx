import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z
  .object({
    vehicleId: z.string().min(1, 'Vui lòng chọn xe.'),
    description: z.string().trim().min(3, 'Vui lòng nhập mô tả bảo trì'),
    startDate: z.string().min(1, 'Vui lòng chọn ngày bắt đầu.'),
    endDate: z.string().min(1, 'Vui lòng chọn ngày kết thúc.'),
    cost: z.coerce.number().min(0, 'Chi phi Không hợp lệ.'),
    status: z.enum(['scheduled', 'in_progress', 'completed']),
    note: z.string().optional(),
  })
  .refine((values) => new Date(values.endDate) >= new Date(values.startDate), {
    path: ['endDate'],
    message: 'Ngày kết thúc phải lớn hơn hoặc chính là ngày bắt đầu.',
  });

const defaultValues = {
  vehicleId: '',
  description: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  cost: 0,
  status: 'scheduled',
  note: '',
};

export default function MaintenanceFormModal({
  open,
  vehicles,
  editingRecord,
  loading,
  onClose,
  onSubmit,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!editingRecord) {
      reset(defaultValues);
      return;
    }

    reset({
      vehicleId: editingRecord.vehicleId,
      description: editingRecord.description,
      startDate: editingRecord.startDate,
      endDate: editingRecord.endDate,
      cost: editingRecord.cost,
      status: editingRecord.status,
      note: editingRecord.note || '',
    });
  }, [open, editingRecord, reset]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/35 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          {editingRecord ? 'Cập nhật phiếu bảo trì' : 'Thêm phiếu bảo trì'}
        </h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="flex flex-col gap-1.5">
            <span className="form-label">Xe</span>
            <select className="input-field" {...register('vehicleId')}>
              <option value="">Chọn xe</option>
              {(vehicles || []).map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber} - {vehicle.displayName}
                </option>
              ))}
            </select>
            {errors.vehicleId ? <span className="error-text">{errors.vehicleId.message}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="form-label">Trạng thái</span>
            <select className="input-field" {...register('status')}>
              <option value="scheduled">Đã lên lịch</option>
              <option value="in_progress">Đang bảo trì</option>
              <option value="completed">Hoàn tất</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="form-label">Mô tả</span>
            <input className="input-field" {...register('description')} />
            {errors.description ? <span className="error-text">{errors.description.message}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="form-label">Ngày bắt đầu</span>
            <input className="input-field" type="date" {...register('startDate')} />
            {errors.startDate ? <span className="error-text">{errors.startDate.message}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="form-label">Ngày kết thúc</span>
            <input className="input-field" type="date" {...register('endDate')} />
            {errors.endDate ? <span className="error-text">{errors.endDate.message}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="form-label">Chi phí</span>
            <input className="input-field" type="number" min={0} {...register('cost')} />
            {errors.cost ? <span className="error-text">{errors.cost.message}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="form-label">Ghi chú</span>
            <textarea className="input-field resize-y" rows={3} {...register('note')} />
          </label>

          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : editingRecord ? 'Lưu Cập nhật' : 'Tạo phiếu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



