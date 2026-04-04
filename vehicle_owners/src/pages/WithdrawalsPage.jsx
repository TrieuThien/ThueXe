import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import SearchFilterBar from '../components/ui/SearchFilterBar';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import SummaryCard from '../components/ui/SummaryCard';
import { ownerService } from '../services/ownerService';
import { STATUS_LABELS, WITHDRAWAL_STATUS } from '../constants/ownerStatus';
import { formatCurrency, formatDateTime } from '../utils/format';
import { ownerRevenueService } from '../services/ownerRevenueService';

const statusOptions = Object.values(WITHDRAWAL_STATUS).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

const schema = z.object({
  amount: z.coerce.number().min(100000, 'Số tiền tối thiểu là 100.000 VND'),
  bankName: z.string().min(2, 'Vui lòng nhập tên ngân hàng'),
  bankAccount: z.string().min(8, 'Số tài khoản không hợp lệ'),
});

const defaultValues = {
  amount: 100000,
  bankName: '',
  bankAccount: '',
};

export default function WithdrawalsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState({ page: 1, pageSize: 5, search: '', status: 'all' });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner-withdrawals', query],
    queryFn: () => ownerService.getWithdrawals(query),
  });

  const walletBalanceQuery = useQuery({
    queryKey: ['owner-revenue-wallet'],
    queryFn: ownerRevenueService.getWalletBalance,
  });

  const wallet = walletBalanceQuery.data || {};
  const availableBalance = Number(wallet.availableBalance || 0);
  const pendingWithdrawal = Number(wallet.pendingWithdrawal || 0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues });

  useEffect(() => {
    const defaultBank = wallet.defaultBankAccount || {};
    if (!getValues('bankName') && defaultBank.bankName) {
      setValue('bankName', defaultBank.bankName);
    }
    if (!getValues('bankAccount') && defaultBank.bankAccountNumber) {
      setValue('bankAccount', defaultBank.bankAccountNumber);
    }
  }, [wallet.defaultBankAccount, getValues, setValue]);

  const mutation = useMutation({
    mutationFn: ownerService.createWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['owner-revenue-wallet'] });
      toast.success('Đã tạo yêu cầu rút tiền.');
      reset({
        amount: defaultValues.amount,
        bankName: wallet.defaultBankAccount?.bankName || '',
        bankAccount: wallet.defaultBankAccount?.bankAccountNumber || '',
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const columns = useMemo(
    () => [
      { key: 'requestCode', header: 'Mã yêu cầu' },
      { key: 'amount', header: 'Số tiền', render: (row) => formatCurrency(row.amount) },
      { key: 'createdAt', header: 'Thời gian', render: (row) => formatDateTime(row.createdAt) },
      { key: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} /> },
    ],
    [],
  );

  const onSubmit = (values) => {
    if (values.amount > availableBalance) {
      toast.error('Số dư khả dụng không đủ để rút tiền.');
      return;
    }
    mutation.mutate({
      amount: values.amount,
      note: `Rut tien ve ${values.bankName} - ${values.bankAccount}`,
    });
  };

  return (
    <section>
      <PageHeader
        title="Rút tiền"
        description="Tạo yêu cầu rút tiền nhanh, theo dõi tiến trình duyệt và lịch sử chuyển khoản."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard title="Số dư khả dụng" value={formatCurrency(availableBalance)} tone="positive" />
        <SummaryCard title="Số dư tạm giữ" value={formatCurrency(pendingWithdrawal)} tone="warning" />
      </div>

      <div className="surface-card mb-4 mt-4">
        <h3 className="mb-3 text-lg font-bold">Tạo yêu cầu rút tiền</h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          

          <div className="flex flex-col gap-1.5">
            <label className="form-label">Ngân hàng</label>
            <input
              className="input-field cursor-not-allowed bg-slate-100 text-slate-600"
              readOnly
              {...register('bankName')}
            />
            {errors.bankName && <p className="error-text">{errors.bankName.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="form-label">Số tài khoản</label>
            <input
              className="input-field cursor-not-allowed bg-slate-100 text-slate-600"
              readOnly
              {...register('bankAccount')}
            />
            {errors.bankAccount && <p className="error-text">{errors.bankAccount.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="form-label">Số tiền rút (VND)</label>
            <input className="input-field" type="number" {...register('amount')} />
            {errors.amount && <p className="error-text">{errors.amount.message}</p>}
          </div>
          <div className="flex justify-end md:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              Gửi yêu cầu
            </button>
          </div>
        </form>
      </div>

      <SearchFilterBar
        searchValue={query.search}
        onSearchChange={(search) => setQuery((prev) => ({ ...prev, page: 1, search }))}
        statusValue={query.status}
        onStatusChange={(status) => setQuery((prev) => ({ ...prev, page: 1, status }))}
        statusOptions={statusOptions}
        onReset={() => setQuery((prev) => ({ ...prev, page: 1, search: '', status: 'all' }))}
        searchPlaceholder="Tìm theo mã yêu cầu, ghi chú..."
      />

      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={isLoading || walletBalanceQuery.isLoading}
        error={isError || walletBalanceQuery.isError}
        pagination={data}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        emptyMessage="Chưa có yêu cầu rút tiền."
      />
    </section>
  );
}
