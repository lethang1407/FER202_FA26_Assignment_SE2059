import { useMemo, useState } from 'react';
import { Button, Form, Nav, Stack, Table } from 'react-bootstrap';
import { contractApi } from '../../api/contractApi';
import { invoiceApi } from '../../api/invoiceApi';
import { roomApi } from '../../api/roomApi';
import { tenantApi } from '../../api/tenantApi';
import ConfirmModal from '../../components/common/ConfirmModal';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { usePagination } from '../../hooks/usePagination';
import { createContract, endContract, updateContract } from '../../services/contractService';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { getContractStatus } from '../../utils/status';
import { cleanSpaces, normalize } from '../../utils/text';
import ContractFormModal from './ContractFormModal';

const EMPTY_ROOMS = [];
const EMPTY_TENANTS = [];
const EMPTY_CONTRACTS = [];

async function fetchContractData() {
  const [contracts, rooms, tenants, invoices] = await Promise.all([
    contractApi.getAllExpanded(),
    roomApi.getAll(),
    tenantApi.getAll(),
    invoiceApi.getAll(),
  ]);
  const roomsById = new Map(rooms.map((room) => [String(room.id), room]));
  const tenantsById = new Map(tenants.map((tenant) => [String(tenant.id), tenant]));
  const invoicesByContract = new Map();

  invoices.forEach((invoice) => {
    const key = String(invoice.contractId);
    invoicesByContract.set(key, (invoicesByContract.get(key) || 0) + 1);
  });

  return {
    contracts: contracts.map((contract) => ({
      ...contract,
      room: contract.room || roomsById.get(String(contract.roomId)),
      tenant: contract.tenant || tenantsById.get(String(contract.tenantId)),
      displayStatus: getContractStatus(contract),
      invoiceCount: invoicesByContract.get(String(contract.id)) || 0,
    })),
    rooms,
    tenants,
  };
}

const STATUS_FILTERS = [
  ['all', 'Tất cả'],
  ['active', 'Hiệu lực'],
  ['expiring', 'Sắp hết hạn'],
  ['expired', 'Quá hạn thanh lý'],
  ['ended', 'Đã kết thúc'],
];

export default function ContractsPage() {
  const { data, loading, error, reload } = useFetch(fetchContractData);
  const { showSuccess } = useToast();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingContract, setEditingContract] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [endingContract, setEndingContract] = useState(null);
  const contracts = data ? data.contracts : EMPTY_CONTRACTS;
  const rooms = data ? data.rooms : EMPTY_ROOMS;
  const tenants = data ? data.tenants : EMPTY_TENANTS;

  const activeContracts = useMemo(
    () => contracts.filter((contract) => contract.status === 'active'),
    [contracts]
  );
  const availableRooms = useMemo(
    () => rooms.filter((room) => room.status === 'available'),
    [rooms]
  );
  const eligibleTenants = useMemo(() => {
    const activeTenantIds = new Set(
      activeContracts.map((contract) => String(contract.tenantId))
    );
    return tenants.filter((tenant) => !activeTenantIds.has(String(tenant.id)));
  }, [activeContracts, tenants]);

  const filteredContracts = useMemo(() => {
    const normalizedKeyword = normalize(keyword);
    return contracts
      .filter((contract) => {
        const matchesStatus =
          statusFilter === 'all' || contract.displayStatus === statusFilter;
        const searchable = normalize(
          `${contract.room?.name || ''} ${contract.tenant?.fullName || ''} ${
            contract.tenant?.phone || ''
          }`
        );
        return matchesStatus && (!normalizedKeyword || searchable.includes(normalizedKeyword));
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.id - a.id);
  }, [contracts, keyword, statusFilter]);

  const { pageItems, page, setPage, totalPages } = usePagination(filteredContracts);

  const openCreate = () => {
    setEditingContract(null);
    setFormOpen(true);
  };

  const openEdit = (contract) => {
    setEditingContract(contract);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingContract(null);
  };

  const saveContract = async (values) => {
    if (editingContract) {
      await updateContract(editingContract.id, values);
      showSuccess(`Đã cập nhật hợp đồng #${editingContract.id}`);
    } else {
      const room = rooms.find((item) => String(item.id) === String(values.roomId));
      const tenant = tenants.find(
        (item) => String(item.id) === String(values.tenantId)
      );
      await createContract(values);
      showSuccess(
        `Đã tạo hợp đồng. Phòng ${room?.name || ''} chuyển sang Đang thuê${
          tenant ? ` cho ${cleanSpaces(tenant.fullName)}` : ''
        }`
      );
    }
    closeForm();
    await reload();
  };

  const confirmEndContract = async () => {
    if (!endingContract) return;
    const roomName =
      endingContract.room?.name || `#${endingContract.roomId}`;
    await endContract(endingContract.id);
    showSuccess(`Đã kết thúc hợp đồng. Phòng ${roomName} chuyển sang Trống`);
    setEndingContract(null);
    await reload();
  };

  return (
    <>
      <PageHeader
        title="Quản lý hợp đồng"
        description="Theo dõi thời hạn hợp đồng và trạng thái thuê phòng."
        actions={
          <Button onClick={openCreate} disabled={!availableRooms.length || !eligibleTenants.length}>
            Tạo hợp đồng
          </Button>
        }
      />

      {data && (!availableRooms.length || !eligibleTenants.length) && (
        <div className="small text-secondary mb-3">
          {!availableRooms.length && 'Hiện không có phòng trống. '}
          {!eligibleTenants.length && 'Không có người thuê chưa có hợp đồng hiệu lực.'}
        </div>
      )}

      <Stack direction="horizontal" gap={3} className="mb-3 flex-wrap">
        <Nav
          variant="pills"
          activeKey={statusFilter}
          onSelect={(key) => key && setStatusFilter(key)}
          className="flex-wrap"
        >
          {STATUS_FILTERS.map(([key, label]) => (
            <Nav.Item key={key}>
              <Nav.Link eventKey={key}>{label}</Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
        <Form.Group controlId="contract-search" className="flex-grow-1">
          <Form.Label className="visually-hidden">Tìm hợp đồng</Form.Label>
          <Form.Control
            type="search"
            placeholder="Tìm theo phòng, người thuê hoặc số điện thoại"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </Form.Group>
      </Stack>

      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        isEmpty={!loading && !error && filteredContracts.length === 0}
        emptyMessage={
          contracts.length === 0
            ? 'Chưa có hợp đồng. Tạo hợp đồng để ghi nhận phòng đang thuê.'
            : 'Không tìm thấy hợp đồng phù hợp.'
        }
      >
        <div className="table-responsive rounded bg-white shadow-sm">
          <Table hover responsive className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Phòng</th>
                <th scope="col">Người thuê</th>
                <th scope="col">Số điện thoại</th>
                <th scope="col">Bắt đầu</th>
                <th scope="col">Kết thúc</th>
                <th scope="col" className="text-end">Tiền cọc</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((contract) => (
                <tr key={contract.id}>
                  <th scope="row">{contract.room?.name || `#${contract.roomId}`}</th>
                  <td>{contract.tenant?.fullName || `#${contract.tenantId}`}</td>
                  <td>{contract.tenant?.phone || '—'}</td>
                  <td className="text-nowrap">{formatDate(contract.startDate)}</td>
                  <td className="text-nowrap">{formatDate(contract.endDate)}</td>
                  <td className="text-end text-nowrap">
                    {formatCurrency(contract.deposit)}
                  </td>
                  <td>
                    <StatusBadge type="contract" value={contract.displayStatus} />
                  </td>
                  <td>
                    <div className="d-flex justify-content-end gap-2">
                      {contract.status === 'active' && (
                        <>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => openEdit(contract)}
                            aria-label={`Sửa hợp đồng ${contract.id}`}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setEndingContract(contract)}
                            aria-label={`Kết thúc hợp đồng ${contract.id}`}
                          >
                            Kết thúc
                          </Button>
                        </>
                      )}
                      {contract.status !== 'active' && (
                        <span className="text-secondary small">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="d-flex justify-content-between align-items-center gap-3 mt-3">
          <small className="text-secondary">
            {filteredContracts.length} hợp đồng · Trang {page} / {totalPages}
          </small>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </DataState>

      {data && (
        <ContractFormModal
          key={`${formOpen ? 'open' : 'closed'}-${editingContract?.id ?? 'new'}`}
          show={formOpen}
          contract={editingContract}
          rooms={editingContract ? rooms : availableRooms}
          tenants={editingContract ? tenants : eligibleTenants}
          onSave={saveContract}
          onCancel={closeForm}
        />
      )}

      <ConfirmModal
        show={Boolean(endingContract)}
        title="Xác nhận kết thúc hợp đồng"
        message={
          endingContract
            ? `Kết thúc hợp đồng phòng ${
                endingContract.room?.name || `#${endingContract.roomId}`
              }? Phòng sẽ chuyển về trạng thái Trống. Chỉ có thể kết thúc khi không còn hóa đơn chưa thanh toán.`
            : ''
        }
        confirmText="Kết thúc hợp đồng"
        variant="danger"
        onConfirm={confirmEndContract}
        onCancel={() => setEndingContract(null)}
      />
    </>
  );
}
