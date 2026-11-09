import { contractApi } from '../../api/contractApi';
import { invoiceApi } from '../../api/invoiceApi';
import { roomApi } from '../../api/roomApi';
import { addDays, currentMonthStr, todayStr } from '../../utils/date';
import { getDashboardData } from '../dashboardService';

jest.mock('../../api/contractApi', () => ({
  contractApi: { getAllExpanded: jest.fn() },
}));
jest.mock('../../api/invoiceApi', () => ({
  invoiceApi: { getAll: jest.fn() },
}));
jest.mock('../../api/roomApi', () => ({
  roomApi: { getAll: jest.fn() },
}));

describe('dashboard service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('aggregates room occupancy, collected revenue, debt, overdue bills, and expiring contracts', async () => {
    const month = currentMonthStr();
    const rooms = [
      { id: 1, name: 'P101', status: 'occupied' },
      { id: 2, name: 'P102', status: 'available' },
      { id: 3, name: 'P103', status: 'maintenance' },
      { id: 4, name: 'P104', status: 'occupied' },
    ];
    const contracts = [
      {
        id: 1,
        roomId: 1,
        status: 'active',
        endDate: addDays(todayStr(), 26),
        room: rooms[0],
        tenant: { fullName: 'Nguyễn Văn An' },
      },
      {
        id: 2,
        roomId: 2,
        status: 'active',
        endDate: addDays(todayStr(), 31),
        room: rooms[1],
        tenant: { fullName: 'Trần Thị Bình' },
      },
    ];
    const invoices = [
      {
        id: 1,
        contractId: 1,
        roomId: 1,
        month,
        total: '1200000',
        status: 'paid',
        paidDate: `${month}-02`,
      },
      {
        id: 2,
        contractId: 1,
        roomId: 1,
        month,
        total: 300000,
        status: 'paid',
        paidDate: `${month}-03`,
      },
      {
        id: 3,
        contractId: 2,
        roomId: 2,
        month,
        total: 500000,
        status: 'unpaid',
        dueDate: addDays(todayStr(), -1),
      },
      {
        id: 4,
        contractId: 2,
        roomId: 2,
        month,
        total: 200000,
        status: 'unpaid',
        dueDate: addDays(todayStr(), 1),
      },
      {
        id: 5,
        contractId: 2,
        roomId: 2,
        month,
        total: 900000,
        status: 'paid',
        paidDate: addDays(todayStr(), -1),
      },
    ];
    roomApi.getAll.mockResolvedValue(rooms);
    contractApi.getAllExpanded.mockResolvedValue(contracts);
    invoiceApi.getAll.mockResolvedValue(invoices);

    const result = await getDashboardData();

    expect(result).toMatchObject({
      totalRooms: 4,
      occupied: 2,
      available: 1,
      maintenance: 1,
      occupancyRate: 50,
      revenueThisMonth: 2400000,
      debt: 700000,
      overdueCount: 1,
    });
    expect(result.expiringContracts).toHaveLength(1);
    expect(result.expiringContracts[0].room.name).toBe('P101');
    expect(result.overdueInvoices[0]).toMatchObject({
      room: { name: 'P102' },
      tenant: { fullName: 'Trần Thị Bình' },
    });
    expect(roomApi.getAll).toHaveBeenCalledTimes(1);
    expect(contractApi.getAllExpanded).toHaveBeenCalledTimes(1);
    expect(invoiceApi.getAll).toHaveBeenCalledTimes(1);
  });

  test('returns zero-safe values and empty lists when the database has no records', async () => {
    roomApi.getAll.mockResolvedValue([]);
    contractApi.getAllExpanded.mockResolvedValue([]);
    invoiceApi.getAll.mockResolvedValue([]);

    await expect(getDashboardData()).resolves.toEqual({
      totalRooms: 0,
      occupied: 0,
      available: 0,
      maintenance: 0,
      occupancyRate: 0,
      revenueThisMonth: 0,
      debt: 0,
      overdueCount: 0,
      expiringContracts: [],
      overdueInvoices: [],
    });
  });
});
