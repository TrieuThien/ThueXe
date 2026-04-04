export default function SearchFilterBar({
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  statusOptions = [],
  onReset,
  searchPlaceholder = 'Tim kiem...',
}) {
  return (
    <div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px_auto]">
      <input
        className="input-field"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
      />

      <select className="input-field" value={statusValue} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="all">Tất cả Trạng thái</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button type="button" className="btn" onClick={onReset}>
        Đặt lại
      </button>
    </div>
  );
}

