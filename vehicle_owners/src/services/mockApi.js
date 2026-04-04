const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateId = (prefix) => `${prefix}-${Date.now()}`;

export const paginate = (items, page = 1, pageSize = 10) => {
  const currentPage = Number(page) || 1;
  const size = Number(pageSize) || 10;
  const start = (currentPage - 1) * size;
  const end = start + size;

  return {
    items: items.slice(start, end),
    page: currentPage,
    pageSize: size,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  };
};

export const queryByKeyword = (list, keyword, fields) => {
  if (!keyword) {
    return list;
  }

  const normalized = keyword.toLowerCase();
  return list.filter((item) =>
    fields.some((field) => String(item[field] || '').toLowerCase().includes(normalized)),
  );
};

export const queryByStatus = (list, status) => {
  if (!status || status === 'all') {
    return list;
  }

  return list.filter((item) => item.status === status);
};

export const simulate = async (callback, customDelay = 450) => {
  await delay(customDelay);
  return callback();
};

