import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { contractApi } from '../../../api/contractApi';
import { roomApi } from '../../../api/roomApi';
import { tenantApi } from '../../../api/tenantApi';
import { ToastProvider } from '../../../context/ToastContext';
import TenantsPage from '../TenantsPage';

jest.mock('../../../api/contractApi', () => ({
  contractApi: { getAll: jest.fn() },
}));
jest.mock('../../../api/roomApi', () => ({
  roomApi: { getAll: jest.fn() },
}));
jest.mock('../../../api/tenantApi', () => ({
  tenantApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const tenants = [
  {
    id: 1,
    fullName: 'Nguyễn Văn An',
    phone: '0901234567',
    idCard: '001201000001',
    hometown: 'Hà Nam',
  },
  {
    id: 2,
    fullName: 'Trần Thị Bình',
    phone: '0912345678',
    idCard: '001301000002',
    hometown: 'Nam Định',
  },
];

function renderTenantsPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <TenantsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('tenants page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tenantApi.getAll.mockResolvedValue(tenants);
    contractApi.getAll.mockResolvedValue([
      { id: 1, tenantId: 1, roomId: 4, status: 'active' },
    ]);
    roomApi.getAll.mockResolvedValue([{ id: 4, name: 'P104' }]);
  });

  test('loads current room and searches by name without accents, phone, and ID card', async () => {
    renderTenantsPage();

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('P104')).toBeInTheDocument();

    const search = screen.getByLabelText('Tìm theo tên, số điện thoại hoặc CCCD');
    fireEvent.change(search, { target: { value: 'nguyen' } });
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.queryByText('Trần Thị Bình')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '0912345678' } });
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '001201000001' } });
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
  });

  test('creates a tenant and reloads the list', async () => {
    tenantApi.create.mockResolvedValue({ id: 3, fullName: 'Lê Văn Cường' });
    renderTenantsPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Thêm người thuê' }));
    fireEvent.change(screen.getByLabelText('Họ tên *'), {
      target: { value: 'Lê Văn Cường' },
    });
    fireEvent.change(screen.getByLabelText('Số điện thoại *'), {
      target: { value: '0923456789' },
    });
    fireEvent.change(screen.getByLabelText('CCCD *'), {
      target: { value: '001202000003' },
    });
    fireEvent.change(screen.getByLabelText('Quê quán *'), {
      target: { value: 'Thanh Hóa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => {
      expect(tenantApi.create).toHaveBeenCalledWith({
        fullName: 'Lê Văn Cường',
        phone: '0923456789',
        idCard: '001202000003',
        hometown: 'Thanh Hóa',
      });
      expect(tenantApi.getAll.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('shows deletion rule errors without removing the tenant', async () => {
    contractApi.getAll
      .mockResolvedValueOnce([{ id: 1, tenantId: 1, roomId: 4, status: 'active' }])
      .mockResolvedValueOnce([{ id: 1, tenantId: 1, roomId: 4, status: 'active' }]);
    renderTenantsPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Xóa người thuê Nguyễn Văn An' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa người thuê' }));

    expect(
      await screen.findByText('Không thể xóa: người thuê đang có hợp đồng hiệu lực')
    ).toBeInTheDocument();
    expect(tenantApi.remove).not.toHaveBeenCalled();
  });
});
