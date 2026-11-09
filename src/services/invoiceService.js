import { contractApi } from '../api/contractApi';
import { invoiceApi } from '../api/invoiceApi';
import { roomApi } from '../api/roomApi';
import { AppError } from '../utils/AppError';
import {
  DEFAULT_ELECTRIC_PRICE,
  DEFAULT_WATER_PRICE,
  DEFAULT_DUE_DAYS,
} from '../utils/constants';
import { calcInvoice } from '../utils/calcInvoice';
import {
  addDays,
  addMonths,
  currentMonthStr,
  formatMonth,
  isValidDateStr,
  todayStr,
} from '../utils/date';
import { validateInvoice, validatePaymentDate } from '../utils/validators';

function assertValid(errors) {
  const message = Object.values(errors)[0];
  if (message) throw new AppError(message);
}

function normalizeInvoice(invoice) {
  return [...invoice].sort((a, b) => b.month.localeCompare(a.month))[0] || null;
}

export async function getInvoiceContext(contractId) {
  const numericId = Number(contractId);
  if (!contractId || !Number.isInteger(numericId) || numericId < 1) {
    throw new AppError('Vui lòng chọn hợp đồng đang hiệu lực');
  }

  const [contract, invoices] = await Promise.all([
    contractApi.getById(numericId),
    invoiceApi.getAll({ contractId: numericId }),
  ]);
  const latest = normalizeInvoice(invoices);

  return {
    contract,
    firstInvoice: !latest,
    latestMonth: latest?.month ?? null,
    electricOld: latest?.electricNew ?? 0,
    waterOld: latest?.waterNew ?? 0,
    invoices,
  };
}

export function getDefaultInvoiceMonth(context, today = currentMonthStr()) {
  if (!context?.contract || !context.contract.startDate) return '';
  const firstAllowedMonth = context.contract.startDate.slice(0, 7);
  const nextMonth = context.latestMonth
    ? addMonths(`${context.latestMonth}-01`, 1).slice(0, 7)
    : firstAllowedMonth > today
      ? firstAllowedMonth
      : today;
  const candidate = nextMonth < firstAllowedMonth ? firstAllowedMonth : nextMonth;
  const lastAllowedMonth = [context.contract.endDate.slice(0, 7), today].sort()[0];

  return candidate <= lastAllowedMonth ? candidate : '';
}

function validateCreateContext(context, values) {
  if (!context.contract || context.contract.status !== 'active') {
    throw new AppError('Hợp đồng không còn hiệu lực');
  }

  assertValid(
    validateInvoice(values, {
      ...context,
      contractId: values.contractId,
      createdDate: todayStr(),
      latestMonth: null,
    })
  );
}

export async function createInvoice(values) {
  const contractId = Number(values.contractId);
  if (!Number.isInteger(contractId)) {
    throw new AppError('Vui lòng chọn hợp đồng đang hiệu lực');
  }

  const context = await getInvoiceContext(contractId);
  validateCreateContext(context, values);
  const room = await roomApi.getById(context.contract.roomId);
  const sameRoomMonth = await invoiceApi.getAll({
    roomId: room.id,
    month: values.month,
  });

  if (sameRoomMonth.length > 0) {
    throw new AppError(
      `Phòng ${room.name} đã có hóa đơn tháng ${formatMonth(values.month)}`
    );
  }
  if (context.latestMonth && values.month <= context.latestMonth) {
    throw new AppError(
      `Chỉ được lập hóa đơn cho tháng sau ${formatMonth(context.latestMonth)}`
    );
  }

  const electricOld = context.firstInvoice
    ? Number(values.electricOld)
    : context.electricOld;
  const waterOld = context.firstInvoice
    ? Number(values.waterOld)
    : context.waterOld;
  const base = {
    contractId,
    roomId: room.id,
    month: values.month,
    roomFee: room.price,
    electricOld,
    electricNew: Number(values.electricNew),
    electricPrice: Number(values.electricPrice),
    waterOld,
    waterNew: Number(values.waterNew),
    waterPrice: Number(values.waterPrice),
    otherFee: Number(values.otherFee),
  };
  const { total } = calcInvoice(base);
  const createdDate = todayStr();

  return invoiceApi.create({
    ...base,
    total,
    createdDate,
    dueDate: values.dueDate,
    status: 'unpaid',
    paidDate: null,
  });
}

export async function updateInvoice(id, values) {
  const invoice = await invoiceApi.getById(id);
  if (invoice.status === 'paid') {
    throw new AppError('Hóa đơn đã thanh toán không thể sửa hoặc xóa');
  }

  const context = await getInvoiceContext(invoice.contractId);
  const formContext = {
    ...context,
    contractId: invoice.contractId,
    firstInvoice: false,
    electricOld: invoice.electricOld,
    waterOld: invoice.waterOld,
    createdDate: invoice.createdDate,
    editingMonth: invoice.month,
    latestMonth: null,
  };
  assertValid(
    validateInvoice(
      {
        ...values,
        contractId: String(invoice.contractId),
        month: invoice.month,
      },
      formContext
    )
  );

  const invoices = context.invoices;
  const hasLaterInvoice = invoices.some((item) => item.month > invoice.month);
  const electricNew = Number(values.electricNew);
  const waterNew = Number(values.waterNew);
  if (
    hasLaterInvoice &&
    (electricNew !== invoice.electricNew || waterNew !== invoice.waterNew)
  ) {
    throw new AppError('Không thể sửa chỉ số vì đã có hóa đơn của tháng sau');
  }

  const next = {
    ...invoice,
    electricNew,
    waterNew,
    electricPrice: Number(values.electricPrice),
    waterPrice: Number(values.waterPrice),
    otherFee: Number(values.otherFee),
    dueDate: values.dueDate,
  };
  next.total = calcInvoice(next).total;
  return invoiceApi.update(id, next);
}

export async function deleteInvoice(id) {
  const invoice = await invoiceApi.getById(id);
  if (invoice.status === 'paid') {
    throw new AppError('Hóa đơn đã thanh toán không thể sửa hoặc xóa');
  }

  const invoices = await invoiceApi.getAll({ contractId: invoice.contractId });
  if (invoices.some((item) => item.month > invoice.month)) {
    throw new AppError('Chỉ được xóa hóa đơn mới nhất của hợp đồng');
  }

  return invoiceApi.remove(id);
}

export async function payInvoice(id, paidDate) {
  const invoice = await invoiceApi.getById(id);
  if (invoice.status === 'paid') {
    throw new AppError('Hóa đơn này đã được thanh toán');
  }

  const dateError = validatePaymentDate(paidDate, invoice.createdDate);
  if (dateError) throw new AppError(dateError);
  return invoiceApi.patch(id, { status: 'paid', paidDate });
}

export function getInvoiceFormDefaults() {
  const createdDate = todayStr();
  return {
    contractId: '',
    month: '',
    electricOld: '',
    electricNew: '',
    electricPrice: String(DEFAULT_ELECTRIC_PRICE),
    waterOld: '',
    waterNew: '',
    waterPrice: String(DEFAULT_WATER_PRICE),
    otherFee: '0',
    dueDate: addDays(createdDate, DEFAULT_DUE_DAYS),
  };
}

export function isValidInvoiceMonth(month) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') &&
    isValidDateStr(`${month}-01`);
}

export function getNextInvoiceMonth(latestMonth, contractStartDate) {
  return latestMonth
    ? addMonths(`${latestMonth}-01`, 1).slice(0, 7)
    : contractStartDate.slice(0, 7);
}
