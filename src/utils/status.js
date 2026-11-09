import { EXPIRING_DAYS } from './constants';
import { daysBetween, todayStr } from './date';

export const getInvoiceStatus = (invoice) =>
  invoice.status === 'paid'
    ? 'paid'
    : invoice.dueDate < todayStr()
      ? 'overdue'
      : 'unpaid';

export const getContractStatus = (contract) => {
  if (contract.status === 'ended') return 'ended';

  const today = todayStr();
  if (contract.endDate < today) return 'expired';
  if (daysBetween(today, contract.endDate) <= EXPIRING_DAYS) return 'expiring';
  return 'active';
};
