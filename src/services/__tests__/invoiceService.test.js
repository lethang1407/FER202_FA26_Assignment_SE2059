import { contractApi } from '../../api/contractApi';
import { invoiceApi } from '../../api/invoiceApi';
import { roomApi } from '../../api/roomApi';
import { addDays, currentMonthStr, todayStr } from '../../utils/date';
import {
  createInvoice,
  deleteInvoice,
  getDefaultInvoiceMonth,
  getInvoiceContext,
  payInvoice,
  updateInvoice,
} from '../invoiceService';

jest.mock('../../api/contractApi', () => ({
  contractApi: { getById: jest.fn() },
}));
jest.mock('../../api/invoiceApi', () => ({
  invoiceApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('../../api/roomApi', () => ({
  roomApi: { getById: jest.fn() },
}));

const currentMonth = currentMonthStr();
const currentYear = currentMonth.slice(0, 4);
const contract = {
  id: 1,
  roomId: 2,
  startDate: `${currentYear}-01-01`,
  endDate: `${currentYear}-12-31`,
  status: 'active',
};

function validInvoice(overrides = {}) {
  return {
    contractId: '1',
    month: currentMonth,
    electricOld: '100',
    electricNew: '105',
    electricPrice: '4000',
    waterOld: '20',
    waterNew: '23',
    waterPrice: '20000',
    otherFee: '50000',
    dueDate: addDays(todayStr(), 5),
    ...overrides,
  };
}

describe('invoice service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contractApi.getById.mockResolvedValue(contract);
    invoiceApi.getAll.mockResolvedValue([]);
    roomApi.getById.mockResolvedValue({
      id: 2,
      name: 'P102',
      price: 2800000,
    });
  });

  test('loads the latest meter readings and computes the next invoice month', async () => {
    invoiceApi.getAll.mockResolvedValueOnce([
      { month: `${currentYear}-01`, electricNew: 110, waterNew: 21 },
      { month: `${currentYear}-02`, electricNew: 125, waterNew: 25 },
    ]);

    const context = await getInvoiceContext(1);

    expect(context).toMatchObject({
      latestMonth: `${currentYear}-02`,
      electricOld: 125,
      waterOld: 25,
      firstInvoice: false,
    });
    expect(getDefaultInvoiceMonth(context)).toBe(`${currentYear}-03`);
  });

  test('defaults a first invoice to the current month or the contract start month', () => {
    expect(
      getDefaultInvoiceMonth({
        contract,
        latestMonth: null,
      })
    ).toBe(currentMonth);
    expect(
      getDefaultInvoiceMonth({
        contract: { ...contract, startDate: `${currentYear}-12-01` },
        latestMonth: null,
      })
    ).toBe('');
  });

  test('creates an invoice with a room-price snapshot and server-calculated total', async () => {
    invoiceApi.create.mockImplementation((invoice) => Promise.resolve(invoice));

    const created = await createInvoice(validInvoice());

    expect(created).toMatchObject({
      contractId: 1,
      roomId: 2,
      roomFee: 2800000,
      month: currentMonth,
      electricOld: 100,
      waterOld: 20,
      total: 2930000,
      status: 'unpaid',
      paidDate: null,
    });
    expect(invoiceApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ total: 2930000, roomFee: 2800000 })
    );
  });

  test('reports an existing room-month before the latest-month rule', async () => {
    invoiceApi.getAll
      .mockResolvedValueOnce([
        { month: `${currentYear}-02`, electricNew: 110, waterNew: 21 },
      ])
      .mockResolvedValueOnce([{ id: 6, month: currentMonth }]);

    await expect(
      createInvoice(
        validInvoice({
          month: `${currentYear}-02`,
          electricOld: '110',
          electricNew: '115',
          waterOld: '21',
        })
      )
    ).rejects.toThrow('đã có hóa đơn tháng');
    expect(invoiceApi.create).not.toHaveBeenCalled();
  });

  test('updates only unpaid invoices, preserving the stored rent snapshot', async () => {
    const existing = {
      id: 9,
      contractId: 1,
      roomId: 2,
      month: currentMonth,
      roomFee: 2500000,
      electricOld: 100,
      electricNew: 105,
      electricPrice: 4000,
      waterOld: 20,
      waterNew: 23,
      waterPrice: 20000,
      otherFee: 50000,
      dueDate: addDays(todayStr(), 5),
      createdDate: todayStr(),
      status: 'unpaid',
    };
    invoiceApi.getById.mockResolvedValue(existing);
    invoiceApi.update.mockImplementation((id, invoice) => Promise.resolve(invoice));

    const updated = await updateInvoice(9, {
      ...validInvoice(),
      electricNew: '110',
    });

    expect(updated.roomFee).toBe(2500000);
    expect(updated.electricNew).toBe(110);
    expect(updated.total).toBe(2650000);
    expect(invoiceApi.update).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ roomFee: 2500000, total: 2650000 })
    );
  });

  test('blocks deleting a non-latest invoice and paying with an invalid date', async () => {
    invoiceApi.getById.mockResolvedValue({
      id: 1,
      contractId: 1,
      month: `${currentYear}-01`,
      status: 'unpaid',
      createdDate: todayStr(),
    });
    invoiceApi.getAll.mockResolvedValue([
      { id: 1, month: `${currentYear}-01` },
      { id: 2, month: `${currentYear}-02` },
    ]);
    await expect(deleteInvoice(1)).rejects.toThrow('hóa đơn mới nhất');

    await expect(payInvoice(1, addDays(todayStr(), 1))).rejects.toThrow(
      'Ngày thanh toán phải từ ngày lập hóa đơn đến hôm nay'
    );
    expect(invoiceApi.patch).not.toHaveBeenCalled();
  });
});
