import { contractApi } from '../api/contractApi';
import { invoiceApi } from '../api/invoiceApi';
import { roomApi } from '../api/roomApi';
import { currentMonthStr, daysBetween, todayStr } from '../utils/date';
import { getContractStatus, getInvoiceStatus } from '../utils/status';

const sumTotals = (invoices) =>
  invoices.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);

export async function getDashboardData() {
  const [rooms, contracts, invoices] = await Promise.all([
    roomApi.getAll(),
    contractApi.getAllExpanded(),
    invoiceApi.getAll(),
  ]);
  const month = currentMonthStr();
  const today = todayStr();
  const countRooms = (status) =>
    rooms.filter((room) => room.status === status).length;
  const unpaidInvoices = invoices.filter((invoice) => invoice.status === 'unpaid');
  const overdueInvoices = unpaidInvoices
    .filter((invoice) => getInvoiceStatus(invoice) === 'overdue')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const roomById = new Map(rooms.map((room) => [String(room.id), room]));
  const contractById = new Map(
    contracts.map((contract) => [String(contract.id), contract])
  );
  const expiringContracts = contracts
    .filter(
      (contract) =>
        contract.status === 'active' &&
        daysBetween(today, contract.endDate) >= 0 &&
        getContractStatus(contract) === 'expiring'
    )
    .map((contract) => ({
      ...contract,
      room:
        contract.room || roomById.get(String(contract.roomId)) || null,
    }))
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  return {
    totalRooms: rooms.length,
    occupied: countRooms('occupied'),
    available: countRooms('available'),
    maintenance: countRooms('maintenance'),
    occupancyRate: rooms.length
      ? Math.round((countRooms('occupied') / rooms.length) * 100)
      : 0,
    revenueThisMonth: sumTotals(
      invoices.filter(
        (invoice) =>
          invoice.status === 'paid' && invoice.paidDate?.slice(0, 7) === month
      )
    ),
    debt: sumTotals(unpaidInvoices),
    overdueCount: overdueInvoices.length,
    expiringContracts,
    overdueInvoices: overdueInvoices.map((invoice) => {
      const contract = contractById.get(String(invoice.contractId));
      return {
        ...invoice,
        room:
          contract?.room ||
          roomById.get(String(invoice.roomId)) ||
          null,
        tenant: contract?.tenant || null,
      };
    }),
  };
}
