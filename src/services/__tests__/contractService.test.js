import { contractApi } from '../../api/contractApi';
import { invoiceApi } from '../../api/invoiceApi';
import { roomApi } from '../../api/roomApi';
import { tenantApi } from '../../api/tenantApi';
import { addMonths, todayStr } from '../../utils/date';
import {
  createContract,
  endContract,
  updateContract,
} from '../contractService';

jest.mock('../../api/contractApi', () => ({
  contractApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('../../api/invoiceApi', () => ({
  invoiceApi: { getAll: jest.fn() },
}));
jest.mock('../../api/roomApi', () => ({
  roomApi: {
    getById: jest.fn(),
    patch: jest.fn(),
  },
}));
jest.mock('../../api/tenantApi', () => ({
  tenantApi: { getById: jest.fn() },
}));

const values = {
  roomId: '1',
  tenantId: '2',
  startDate: todayStr(),
  endDate: addMonths(todayStr(), 12),
  deposit: '2500000',
};

describe('contract service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    roomApi.getById.mockResolvedValue({
      id: 1,
      name: 'P101',
      price: 2500000,
      status: 'available',
    });
    tenantApi.getById.mockResolvedValue({ id: 2, fullName: 'Tenant' });
    contractApi.getAll.mockResolvedValue([]);
  });

  test('creates an active contract and marks its room occupied', async () => {
    contractApi.create.mockResolvedValue({ id: 9, roomId: 1 });
    roomApi.patch.mockResolvedValue({});

    await expect(createContract(values)).resolves.toEqual({ id: 9, roomId: 1 });
    expect(contractApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: 1,
        tenantId: 2,
        status: 'active',
        endedDate: null,
      })
    );
    expect(roomApi.patch).toHaveBeenCalledWith(1, { status: 'occupied' });
  });

  test('blocks stale room availability and duplicate active room or tenant', async () => {
    roomApi.getById.mockResolvedValueOnce({
      id: 1,
      price: 2500000,
      status: 'maintenance',
    });
    await expect(createContract(values)).rejects.toThrow('không còn trống');

    contractApi.getAll.mockResolvedValueOnce([{ roomId: '1', tenantId: 99 }]);
    await expect(createContract(values)).rejects.toThrow(
      'đang có hợp đồng hiệu lực'
    );

    contractApi.getAll.mockResolvedValueOnce([{ roomId: 3, tenantId: '2' }]);
    await expect(createContract(values)).rejects.toThrow(
      'Người thuê này đang có hợp đồng hiệu lực'
    );
    expect(contractApi.create).not.toHaveBeenCalled();
  });

  test('rolls back contract creation and surfaces rollback failures', async () => {
    contractApi.create.mockResolvedValue({ id: 9 });
    roomApi.patch.mockRejectedValue(new Error('room update failed'));
    contractApi.remove.mockResolvedValue({});
    await expect(createContract(values)).rejects.toThrow('room update failed');
    expect(contractApi.remove).toHaveBeenCalledWith(9);

    contractApi.remove.mockRejectedValue(new Error('rollback failed'));
    await expect(createContract(values)).rejects.toThrow('không thể hoàn tác tự động');
  });

  test('blocks ending a contract with unpaid invoices', async () => {
    contractApi.getById.mockResolvedValue({
      id: 4,
      roomId: 1,
      status: 'active',
    });
    invoiceApi.getAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(endContract(4)).rejects.toThrow('Còn 2 hóa đơn chưa thanh toán');
    expect(contractApi.patch).not.toHaveBeenCalled();
  });

  test('ends a contract, releases the room, and rolls back a failed room update', async () => {
    contractApi.getById.mockResolvedValue({
      id: 4,
      roomId: 1,
      status: 'active',
    });
    invoiceApi.getAll.mockResolvedValue([]);
    contractApi.patch.mockResolvedValue({});
    roomApi.patch.mockResolvedValue({});

    await expect(endContract(4)).resolves.toBeUndefined();
    expect(contractApi.patch).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ status: 'ended', endedDate: todayStr() })
    );
    expect(roomApi.patch).toHaveBeenCalledWith(1, { status: 'available' });

    roomApi.patch.mockRejectedValue(new Error('room update failed'));
    await expect(endContract(4)).rejects.toThrow('room update failed');
    expect(contractApi.patch).toHaveBeenLastCalledWith(4, {
      status: 'active',
      endedDate: null,
    });
  });

  test('updates only active contracts and respects the latest invoice month', async () => {
    contractApi.getById.mockResolvedValue({
      id: 4,
      roomId: 1,
      startDate: '2026-01-01',
      status: 'active',
    });
    roomApi.getById.mockResolvedValue({ id: 1, price: 2500000 });
    invoiceApi.getAll.mockResolvedValue([{ month: '2026-10' }]);

    await expect(
      updateContract(4, { endDate: '2026-09-30', deposit: '1000000' })
    ).rejects.toThrow('10/2026');

    await expect(
      updateContract(4, { endDate: '2026-11-30', deposit: '1000000' })
    ).resolves.toBeUndefined();
    expect(contractApi.patch).toHaveBeenCalledWith(4, {
      endDate: '2026-11-30',
      deposit: 1000000,
    });

    contractApi.getById.mockResolvedValueOnce({
      id: 4,
      status: 'ended',
      roomId: 1,
      startDate: '2026-01-01',
    });
    await expect(
      updateContract(4, { endDate: '2026-12-31', deposit: '1000000' })
    ).rejects.toThrow('đang hiệu lực');
  });
});
