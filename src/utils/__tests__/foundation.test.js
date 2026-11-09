import { calcInvoice } from '../calcInvoice';
import { addMonths, daysBetween, isValidDateStr, todayStr, toDateStr } from '../date';
import { formatCurrency } from '../format';
import { normalize } from '../text';
import { getInvoiceStatus } from '../status';

describe('shared utility functions', () => {
  test('calculates the expected total for the first sample invoice', () => {
    const invoice = {
      roomFee: 2500000,
      electricOld: 100,
      electricNew: 150,
      electricPrice: 3500,
      waterOld: 10,
      waterNew: 14,
      waterPrice: 20000,
      otherFee: 50000,
    };

    expect(calcInvoice(invoice).total).toBe(2805000);
    expect(formatCurrency(calcInvoice(invoice).total)).toContain('2.805.000');
  });

  test('uses the local date and handles calendar boundaries', () => {
    const now = new Date();
    expect(todayStr()).toBe(toDateStr(now));
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(daysBetween('2026-11-09', '2026-11-15')).toBe(6);
    expect(isValidDateStr('2024-02-29')).toBe(true);
    expect(isValidDateStr('2025-02-29')).toBe(false);
  });

  test('normalizes Vietnamese text for searching', () => {
    expect(normalize('Nguyễn Đức')).toBe('nguyen duc');
  });

  test('derives overdue status from the current local date', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 9, 12));

    expect(
      getInvoiceStatus({ status: 'unpaid', dueDate: '2026-11-05' })
    ).toBe('overdue');

    jest.useRealTimers();
  });
});
