import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { contractApi } from '../../../api/contractApi';
import { roomApi } from '../../../api/roomApi';
import { tenantApi } from '../../../api/tenantApi';
import { ToastProvider } from '../../../context/ToastContext';
import RoomsPage from '../RoomsPage';

jest.mock('../../../api/contractApi', () => ({
  contractApi: { getAll: jest.fn() },
}));
jest.mock('../../../api/roomApi', () => ({
  roomApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('../../../api/tenantApi', () => ({
  tenantApi: { getAll: jest.fn() },
}));

const rooms = [
  {
    id: 1,
    name: 'P101',
    floor: 1,
    area: 20,
    price: 2500000,
    status: 'occupied',
    description: '',
  },
  {
    id: 2,
    name: 'P103',
    floor: 1,
    area: 22,
    price: 2800000,
    status: 'available',
    description: '',
  },
];

function renderRoomsPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <RoomsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('rooms page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    roomApi.getAll.mockResolvedValue(rooms);
    contractApi.getAll.mockResolvedValue([
      { id: 1, roomId: 1, tenantId: 7, status: 'active' },
    ]);
    tenantApi.getAll.mockResolvedValue([
      { id: 7, fullName: 'Nguyễn Văn An' },
    ]);
  });

  test('loads rooms, displays current tenants, and filters without accents', async () => {
    renderRoomsPage();

    expect(await screen.findByText('P101')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tìm theo tên phòng'), {
      target: { value: 'p103' },
    });

    expect(screen.getByText('P103')).toBeInTheDocument();
    expect(screen.queryByText('P101')).not.toBeInTheDocument();
  });

  test('creates a room from the form and reloads the list', async () => {
    roomApi.create.mockResolvedValue({ id: 3, name: 'P104' });
    renderRoomsPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Thêm phòng' }));
    fireEvent.change(screen.getByLabelText('Tên phòng *'), {
      target: { value: 'P104' },
    });
    fireEvent.change(screen.getByLabelText('Tầng *'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Diện tích (m²) *'), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText('Giá thuê/tháng (₫) *'), {
      target: { value: '2400000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => {
      expect(roomApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'P104', floor: 2, price: 2400000 })
      );
      expect(roomApi.getAll.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('keeps form open and shows a service conflict when deleting', async () => {
    contractApi.getAll
      .mockResolvedValueOnce([{ id: 1, roomId: 1, tenantId: 7, status: 'active' }])
      .mockResolvedValueOnce([{ id: 1, roomId: 1, tenantId: 7, status: 'active' }]);
    renderRoomsPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Xóa phòng P101' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xóa phòng' }));

    expect(
      await screen.findByText('Không thể xóa: phòng đang có hợp đồng hiệu lực')
    ).toBeInTheDocument();
    expect(roomApi.remove).not.toHaveBeenCalled();
  });
});
