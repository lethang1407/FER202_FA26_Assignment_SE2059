import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { contractApi } from '../../../api/contractApi';
import { invoiceApi } from '../../../api/invoiceApi';
import { roomApi } from '../../../api/roomApi';
import { tenantApi } from '../../../api/tenantApi';
import { ToastProvider } from '../../../context/ToastContext';
import ContractsPage from '../ContractsPage';

jest.mock('../../../api/contractApi', () => ({
  contractApi: {
    getAll: jest.fn(),
    getAllExpanded: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('../../../api/invoiceApi', () => ({
  invoiceApi: { getAll: jest.fn() },
}));
jest.mock('../../../api/roomApi', () => ({
  roomApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    patch: jest.fn(),
  },
}));
jest.mock('../../../api/tenantApi', () => ({
  tenantApi: { getAll: jest.fn(), getById: jest.fn() },
}));

const contracts = [
  {
    id: 1,
    roomId: 1,
    tenantId: 1,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    deposit: 2500000,
    status: 'active',
  },
];

function renderContractsPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ContractsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('contracts page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contractApi.getAllExpanded.mockResolvedValue(contracts);
    contractApi.getAll.mockResolvedValue([]);
    roomApi.getAll.mockResolvedValue([
      { id: 1, name: 'P101', price: 2500000, status: 'occupied' },
      { id: 2, name: 'P103', price: 2800000, status: 'available' },
    ]);
    tenantApi.getAll.mockResolvedValue([
      { id: 1, fullName: 'Nguyễn Văn An', phone: '0901234567' },
      { id: 2, fullName: 'Trần Thị Bình', phone: '0912345678' },
    ]);
    invoiceApi.getAll.mockResolvedValue([]);
  });

  test('shows contracts and filters by status and tenant name', async () => {
    renderContractsPage();

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('P101')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo phòng/), {
      target: { value: 'nguyen' },
    });
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đã kết thúc' }));
    expect(screen.getByText('Không tìm thấy hợp đồng phù hợp.')).toBeInTheDocument();
  });

  test('creates a contract with the selected available room and tenant', async () => {
    contractApi.create.mockResolvedValue({ id: 2 });
    roomApi.getById.mockResolvedValue({
      id: 2,
      name: 'P103',
      status: 'available',
      price: 2800000,
    });
    tenantApi.getById.mockResolvedValue({ id: 2, fullName: 'Trần Thị Bình' });
    roomApi.patch.mockResolvedValue({});
    renderContractsPage();

    const openCreateButton = await screen.findByRole('button', {
      name: 'Tạo hợp đồng',
    });
    await waitFor(() => expect(openCreateButton).toBeEnabled());
    fireEvent.click(openCreateButton);
    fireEvent.change(screen.getByLabelText('Phòng *'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Người thuê đại diện *'), {
      target: { value: '2' },
    });
    const createButtons = screen.getAllByRole('button', { name: 'Tạo hợp đồng' });
    fireEvent.click(createButtons[createButtons.length - 1]);

    await waitFor(() => {
      expect(contractApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 2,
          tenantId: 2,
          status: 'active',
          deposit: 2800000,
        })
      );
      expect(roomApi.patch).toHaveBeenCalledWith(2, { status: 'occupied' });
    });
  });

  test('shows unpaid invoice errors when confirming contract end', async () => {
    contractApi.getById.mockResolvedValue({
      id: 1,
      roomId: 1,
      status: 'active',
    });
    invoiceApi.getAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    renderContractsPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Kết thúc hợp đồng 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc hợp đồng' }));

    expect(
      await screen.findByText(
        'Còn 2 hóa đơn chưa thanh toán. Vui lòng thu tiền trước khi kết thúc hợp đồng'
      )
    ).toBeInTheDocument();
    expect(roomApi.patch).not.toHaveBeenCalled();
  });
});
