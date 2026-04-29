import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  rows,
  loading,
  error,
  emptyMessage,
  pagination,
  onPageChange,
  tableClassName = '',
}) {
  if (loading) {
    return <div className="surface-card">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return <div className="surface-card border-red-200 bg-red-50 text-red-700">Không tải được dữ liệu. Vui lòng thử lại.</div>;
  }

  if (!rows.length) {
    return <EmptyState title="Không có bản ghi" message={emptyMessage} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white">
      <div className="overflow-x-auto">
        <table className={`min-w-full border-collapse text-sm ${tableClassName}`}>
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={`px-3 py-3 ${column.headerClassName || 'whitespace-nowrap'}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${column.key}`}
                    style={column.width ? { width: column.width } : undefined}
                    className={`px-3 py-3 text-slate-700 ${column.cellClassName || 'whitespace-nowrap'}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-3 py-2 text-sm">
          <button
            type="button"
            className="btn px-3 py-1.5 text-sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            Trước
          </button>
          <span className="text-slate-600">
            Trang {pagination.page}/{pagination.totalPages} - Tổng {pagination.total}
          </span>
          <button
            type="button"
            className="btn px-3 py-1.5 text-sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
