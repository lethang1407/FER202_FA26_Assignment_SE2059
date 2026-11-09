import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { invoiceApi } from '../../../api/invoiceApi';
import { contractApi } from '../../../api/contractApi';
import { roomApi } from '../../../api/roomApi';
import { tenantApi } from '../../../api/tenantApi';
import { ToastProvider } from '../../../context/ToastContext';
import InvoicesPage from '../InvoicesPage';

jest.mock('../../../api/invoiceApi', () => ({
  invoiceApi: { getAll: jest.fn() },
}));
jest.mock('../../../api/contractApi', () => ({
  contractApi: { getAllExpanded: jest.fn() },
}));
jest.mock('../../../api/roomApi', () => ({
  roomApi: { getAll: jest.fn() },
}));
jest.mock('../../../api/tenantApi', () => ({
  tenantApi: { getAll: jest.fn() },
}));

function renderInvoicesPage() {
  return render(
    <ToastProvider>
      <InvoicesPage />
    </ToastProvider>
  );
}

describe('invoices page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contractApi.getAllExpanded.mockResolvedValue([
      {
        id: 1,
        roomId: 1,
        tenantId: 2,
        status: 'active',
        room: { id: 1, name: 'P101', price: 2500000 },
        tenant: { id: 2, fullName: 'Nguyễn Văn An', phone: '0901234567' },
      },
    ]);
    roomApi.getAll.mockResolvedValue([]);
    tenantApi.getAll.mockResolvedValue([]);
    invoiceApi.getAll.mockResolvedValue([
      {
        id: 1,
        contractId: 1,
        roomId: 1,
        month: '2026-10',
        dueDate: '2026-11-30',
        total: 2800000,
        status: 'unpaid',
      },
      {
        id: 2,
        contractId: 1,
        roomId: 1,
        month: '2026-09',
        dueDate: '2026-10-30',
        total: 2500000,
        status: 'paid',
        paidDate: '2026-10-20',
      },
    ]);
  });

  test('shows linked invoice details and hides actions for paid invoices', async () => {
    renderInvoicesPage();

    expect(await screen.findAllByText('Nguyễn Văn An')).toHaveLength(2);
    expect(screen.getAllByText('P101')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Sửa hóa đơn 1' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sửa hóa đơn 2' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Công nợ:').parentElement
    ).toHaveTextContent('2.800.000');
  });

  test('filters the list by month and status', async () => {
    renderInvoicesPage();

    await screen.findAllByText('Nguyễn Văn An');
    fireEvent.click(screen.getByRole('button', { name: 'Đã thanh toán' }));

    expect(screen.getByText('09/2026')).toBeInTheDocument();
    expect(screen.queryByText('10/2026')).not.toBeInTheDocument();
  });
});
