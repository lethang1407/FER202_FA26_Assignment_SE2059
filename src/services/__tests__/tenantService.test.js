import { contractApi } from '../../api/contractApi';
import { tenantApi } from '../../api/tenantApi';
import { createTenant, deleteTenant, updateTenant } from '../tenantService';

jest.mock('../../api/contractApi', () => ({
  contractApi: { getAll: jest.fn() },
}));
jest.mock('../../api/tenantApi', () => ({
  tenantApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const values = {
  fullName: '  Nguyễn   Văn Bình ',
  phone: '0912345678',
  idCard: '001301000002',
  hometown: ' Nam   Định ',
};

describe('tenant service business rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes and creates a tenant after checking current identifiers', async () => {
    tenantApi.getAll.mockResolvedValue([
      { id: 1, phone: '0901234567', idCard: '001201000001' },
    ]);
    tenantApi.create.mockResolvedValue({ id: 2, fullName: 'Nguyễn Văn Bình' });

    await expect(createTenant(values)).resolves.toEqual({
      id: 2,
      fullName: 'Nguyễn Văn Bình',
    });
    expect(tenantApi.create).toHaveBeenCalledWith({
      fullName: 'Nguyễn Văn Bình',
      phone: '0912345678',
      idCard: '001301000002',
      hometown: 'Nam Định',
    });
  });

  test('blocks duplicate phone and CCCD using fresh server data', async () => {
    tenantApi.getAll.mockResolvedValue([
      { id: 1, phone: values.phone, idCard: '001201000001' },
    ]);
    await expect(createTenant(values)).rejects.toThrow(
      'Số điện thoại đã được dùng bởi người thuê khác'
    );

    tenantApi.getAll.mockResolvedValue([
      { id: 1, phone: '0901234567', idCard: values.idCard },
    ]);
    await expect(createTenant(values)).rejects.toThrow('CCCD đã tồn tại');
    expect(tenantApi.create).not.toHaveBeenCalled();
  });

  test('updates an existing tenant while excluding its own identifiers', async () => {
    tenantApi.getById.mockResolvedValue({
      id: 1,
      ...values,
      fullName: 'Old name',
    });
    tenantApi.getAll.mockResolvedValue([{ id: 1, ...values }]);
    tenantApi.update.mockResolvedValue({ id: 1, fullName: 'Nguyễn Văn Bình' });

    await expect(updateTenant(1, values)).resolves.toEqual({
      id: 1,
      fullName: 'Nguyễn Văn Bình',
    });
    expect(tenantApi.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ phone: values.phone, idCard: values.idCard })
    );
  });

  test('blocks deleting active or historical tenants', async () => {
    contractApi.getAll.mockResolvedValue([{ id: 1, status: 'active' }]);
    await expect(deleteTenant(1)).rejects.toThrow('đang có hợp đồng hiệu lực');

    contractApi.getAll.mockResolvedValue([{ id: 2, status: 'ended' }]);
    await expect(deleteTenant(1)).rejects.toThrow('đã có lịch sử hợp đồng');
    expect(tenantApi.remove).not.toHaveBeenCalled();
  });

  test('deletes a tenant with no contracts', async () => {
    contractApi.getAll.mockResolvedValue([]);
    tenantApi.remove.mockResolvedValue(undefined);

    await expect(deleteTenant(8)).resolves.toBeUndefined();
    expect(tenantApi.remove).toHaveBeenCalledWith(8);
  });
});
