const pad = (value) => String(value).padStart(2, '0');
const parts = (dateString) => dateString.split('-').map(Number);

export const toDateStr = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayStr = () => toDateStr(new Date());
export const currentMonthStr = () => todayStr().slice(0, 7);

export const addDays = (dateString, days) => {
  const [year, month, day] = parts(dateString);
  return toDateStr(new Date(year, month - 1, day + days));
};

export const addMonths = (dateString, months) => {
  const [year, month, day] = parts(dateString);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toDateStr(target);
};

export const daysBetween = (startDate, endDate) => {
  const toUtc = (dateString) => {
    const [year, month, day] = parts(dateString);
    return Date.UTC(year, month - 1, day);
  };

  return Math.round((toUtc(endDate) - toUtc(startDate)) / 86400000);
};

export const isValidDateStr = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || '')) return false;

  const [year, month, day] = parts(dateString);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export const formatDate = (dateString) =>
  dateString ? dateString.split('-').reverse().join('/') : '—';

export const formatMonth = (monthString) =>
  monthString ? monthString.split('-').reverse().join('/') : '—';
