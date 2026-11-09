const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export const formatCurrency = (value) => vndFormatter.format(Number(value) || 0);
