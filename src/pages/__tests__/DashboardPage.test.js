import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { contractApi } from '../../api/contractApi';
import { invoiceApi } from '../../api/invoiceApi';
import { roomApi } from '../../api/roomApi';
import { addDays, currentMonthStr, todayStr } from '../../utils/date';
import DashboardPage from '../DashboardPage';

jest.mock('../../api/roomApi', () => ({
  roomApi: { getAll: jest.fn() },
}));
jest.mock('../../api/invoiceApi', () => ({
  invoiceApi: { getAll: jest.fn() },
}));
jest.mock('../../api/contractApi', () => ({
  contractApi: { getAllExpanded: jest.fn() },
}));

test('shows room occupancy, monthly collection, debt and overdue counts', async () => {
  roomApi.getAll.mockResolvedValue([
    { id: 1, status: 'occupied' },
    { id: 2, status: 'available' },
  ]);
  invoiceApi.getAll.mockResolvedValue([
    {
      id: 1,
      roomId: 1,
      month: currentMonthStr(),
      total: 250000,
      status: 'paid',
      paidDate: `${currentMonthStr()}-02`,
      dueDate: addDays(todayStr(), 2),
    },
    {
      id: 2,
      roomId: 2,
      month: currentMonthStr(),
      total: 100000,
      status: 'unpaid',
      paidDate: null,
      dueDate: addDays(todayStr(), -1),
    },
  ]);
  contractApi.getAllExpanded.mockResolvedValue([
    {
      id: 1,
      status: 'active',
      endDate: addDays(todayStr(), 10),
      room: { name: 'P101' },
      tenant: { fullName: 'Nguyễn Văn An' },
    },
  ]);

  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );

  expect(await screen.findByText('Tỷ lệ lấp đầy 50%')).toBeInTheDocument();
  expect(screen.getByText('Doanh thu tháng này').parentElement).toHaveTextContent(
    '250.000'
  );
  expect(screen.getByText('Công nợ').parentElement).toHaveTextContent('100.000');
  expect(screen.getAllByText('Hóa đơn quá hạn')[0].parentElement).toHaveTextContent(
    '1'
  );
  expect(
    screen.getAllByText('Hợp đồng sắp hết hạn')[0].parentElement
  ).toHaveTextContent('1');
});

test('shows zero-safe summaries when there are no records', async () => {
  roomApi.getAll.mockResolvedValue([]);
  invoiceApi.getAll.mockResolvedValue([]);
  contractApi.getAllExpanded.mockResolvedValue([]);

  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );

  expect(
    (await screen.findByText('Tổng số phòng')).parentElement
  ).toHaveTextContent('0');
  expect(screen.getByText('Tỷ lệ lấp đầy 0%')).toBeInTheDocument();
  expect(screen.getByText('Doanh thu tháng này').parentElement).toHaveTextContent(
    '0'
  );
  expect(screen.getByText('Công nợ').parentElement).toHaveTextContent('0');
  expect(screen.getAllByText('Hóa đơn quá hạn')[0].parentElement).toHaveTextContent(
    '0'
  );
});
