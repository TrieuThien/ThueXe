import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import SearchFilterBar from '../components/ui/SearchFilterBar';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FileUploadField from '../components/ui/FileUploadField';
import { ownerService } from '../services/ownerService';
import { STATUS_LABELS, VEHICLE_STATUS } from '../constants/ownerStatus';
import { formatCurrency, formatDate } from '../utils/format';

const schema = z.object({
  name: z.string().min(3, 'Ten xe toi Thiếu 3 ky tu'),
  plateNumber: z.string().min(7, 'Vui lòng Nhập Biển số hợp lệ'),
  type: z.string().min(2, 'Vui lòng Nhập Loại xe'),
  seats: z.coerce.number().min(2, 'Số chỗ phải lon hon 1'),
  location: z.string().min(2, 'Vui lòng Nhập vi tri xe'),
  pricePerDay: z.coerce.number().min(100000, 'Giá thuê toi Thiếu 100.000 VND'),
  status: z.string(),
  imageFile: z.any().optional(),
});

const defaultValues = {
  name: '',
  plateNumber: '',
  type: '',
  seats: 4,
  location: '',
  pricePerDay: 500000,
  status: VEHICLE_STATUS.PENDING,
  imageFile: null,
};

const statusOptions = Object.values(VEHICLE_STATUS).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState({ page: 1, pageSize: 5, search: '', status: 'all' });
  const [openForm, setOpenForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-vehicles', query],
    queryFn: () => ownerService.getVehicles(query),
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues });

  const createMutation = useMutation({
    mutationFn: ownerService.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-vehicles'] });
      toast.success('Thêm xe thành công');
      setOpenForm(false);
      reset(defaultValues);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => ownerService.updateVehicle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-vehicles'] });
      toast.success('Cập nhật xe thành công');
      setOpenForm(false);
      setEditingVehicle(null);
      reset(defaultValues);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ownerService.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-vehicles'] });
      toast.success('Da Xóa xe');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Xe' },
      { key: 'plateNumber', header: 'Biển số' },
      { key: 'type', header: 'Loại xe' },
      { key: 'pricePerDay', header: 'Gia/ngay', render: (row) => formatCurrency(row.pricePerDay) },
      { key: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} /> },
      { key: 'lastUpdated', header: 'Cập nhật', render: (row) => formatDate(row.lastUpdated) },
      {
        key: 'action',
        header: 'Thao tac',
        render: (row) => (
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => onEdit(row)}>
              Sửa
            </button>
            <button type="button" className="btn btn-Đanger" onClick={() => setDeleteTarget(row)}>
              Xóa
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const onEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setOpenForm(true);
    reset({ ...vehicle, imageFile: vehicle.imageName || null });
  };

  const onCreateClick = () => {
    setEditingVehicle(null);
    reset(defaultValues);
    setOpenForm(true);
  };

  const onSubmit = (values) => {
    const payload = {
      ...values,
      imageName: values.imageFile?.name || values.imageFile || '',
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <section>
      <PageHeader
        title="Quản lý xe"
        description="Thêm xe, Cập nhật thông tin va theo dõi trạng thái duyệt đăng ký."
        actions={
          <button type="button" className="btn btn-primary" onClick={onCreateClick}>
            Thêm xe mới
          </button>
        }
      />

      <SearchFilterBar
        searchValue={query.search}
        onSearchChange={(search) => setQuery((prev) => ({ ...prev, page: 1, search }))}
        statusValue={query.status}
        onStatusChange={(status) => setQuery((prev) => ({ ...prev, page: 1, status }))}
        statusOptions={statusOptions}
        onReset={() => setQuery((prev) => ({ ...prev, page: 1, search: '', status: 'all' }))}
        searchPlaceholder="Tìm theo tên xe, Biển số, Khu vực"
      />

      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={isLoading}
        error={isError}
        pagination={data}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        emptyMessage="Chưa có xe nào. Bấm 'Thêm xe mới' để bắt đầu."
      />

      {openForm && (
        <div className="fixed inset-0 z-[998] grid place-items-center bg-slate-950/55 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-xl font-bold">{editingVehicle ? 'Cập nhật xe' : 'Thêm xe mới'}</h3>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-1.5">
                <label className="form-label">Tên xe</label>
                <input className="input-field" {...register('name')} />
                {errors.name && <p className="error-text">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="form-label">Biển số</label>
                <input className="input-field" {...register('plateNumber')} />
                {errors.plateNumber && <p className="error-text">{errors.plateNumber.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="form-label">Loại xe</label>
                <input className="input-field" {...register('type')} />
                {errors.type && <p className="error-text">{errors.type.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="form-label">Số chỗ</label>
                <input className="input-field" type="number" {...register('seats')} />
                {errors.seats && <p className="error-text">{errors.seats.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="form-label">Khu vực</label>
                <input className="input-field" {...register('location')} />
                {errors.location && <p className="error-text">{errors.location.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="form-label">Giá thuê/ngay (VND)</label>
                <input className="input-field" type="number" {...register('pricePerDay')} />
                {errors.pricePerDay && <p className="error-text">{errors.pricePerDay.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="form-label">Trạng thái</label>
                <select className="input-field" {...register('status')}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <Controller
                name="imageFile"
                control={control}
                render={({ field }) => (
                  <FileUploadField label="Ảnh xe" value={field.value} onChange={(file) => field.onChange(file)} />
                )}
              />

              <div className="col-span-full flex justify-end gap-2">
                <button type="button" className="btn" onClick={() => setOpenForm(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingVehicle ? 'Lưu cập nhật' : 'Tạo xe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa xe"
        message={`Bạn chắc chắn muốn xóa xe ${deleteTarget?.name || ''}?`}
        confirmText="Xóa xe"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </section>
  );
}



