import { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Nav, Stack, Table } from 'react-bootstrap';
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
import {
  deleteInvoice,
  payInvoice,
} from '../../services/invoiceService';
import { formatDate, formatMonth, todayStr } from '../../utils/date';
import { formatCurrency } from '../../utils/format';
import { calcInvoice } from '../../utils/calcInvoice';
import { getInvoiceStatus } from '../../utils/status';
import { normalize } from '../../utils/text';
import InvoiceFormModal from './InvoiceFormModal';

const EMPTY_ARRAY = [];
const STATUS_FILTERS = [
  ['all', 'Tất cả'],
  ['unpaid', 'Chưa thanh toán'],
  ['overdue', 'Quá hạn'],
  ['paid', 'Đã thanh toán'],
];

async function fetchInvoiceData() {
  const [invoices, contracts, rooms, tenants] = await Promise.all([
    invoiceApi.getAll(),
    contractApi.getAllExpanded(),
    roomApi.getAll(),
    tenantApi.getAll(),
  ]);
  const roomsById = new Map(rooms.map((room) => [String(room.id), room]));
  const tenantsById = new Map(tenants.map((tenant) => [String(tenant.id), tenant]));
  const contractsById = new Map(
    contracts.map((contract) => [
      String(contract.id),
      {
        ...contract,
        room: contract.room || roomsById.get(String(contract.roomId)),
        tenant: contract.tenant || tenantsById.get(String(contract.tenantId)),
      },
    ])
  );
  const expandedInvoices = invoices.map((invoice) => {
    const contract = contractsById.get(String(invoice.contractId));
    const room = contract?.room || roomsById.get(String(invoice.roomId));
    const tenant =
      contract?.tenant || tenantsById.get(String(contract?.tenantId));
    return {
      ...invoice,
      contract,
      room,
      tenant,
      displayStatus: getInvoiceStatus(invoice),
    };
  });

  return {
    invoices: expandedInvoices,
    contracts: [...contractsById.values()],
  };
}

function InvoiceDetailsModal({ invoice, onHide }) {
  return (
    <Modal show={Boolean(invoice)} onHide={onHide} centered>
      {invoice && (
        <>
          <Modal.Header closeButton>
            <Modal.Title>Hóa đơn tháng {formatMonth(invoice.month)}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <dl className="row mb-0">
              <dt className="col-5">Phòng</dt>
              <dd className="col-7">{invoice.room?.name || `#${invoice.roomId}`}</dd>
              <dt className="col-5">Người thuê</dt>
              <dd className="col-7">{invoice.tenant?.fullName || '—'}</dd>
              <dt className="col-5">Hợp đồng</dt>
              <dd className="col-7">#{invoice.contractId}</dd>
              <dt className="col-5">Tiền phòng</dt>
              <dd className="col-7">{formatCurrency(invoice.roomFee)}</dd>
              <dt className="col-5">Điện</dt>
              <dd className="col-7">
                {invoice.electricOld} → {invoice.electricNew} kWh (
                {formatCurrency(
                  (invoice.electricNew - invoice.electricOld) * invoice.electricPrice
                )}
                )
              </dd>
              <dt className="col-5">Nước</dt>
              <dd className="col-7">
                {invoice.waterOld} → {invoice.waterNew} m³ (
                {formatCurrency(
                  (invoice.waterNew - invoice.waterOld) * invoice.waterPrice
                )}
                )
              </dd>
              <dt className="col-5">Phí khác</dt>
              <dd className="col-7">{formatCurrency(invoice.otherFee)}</dd>
              <dt className="col-5">Hạn thanh toán</dt>
              <dd className="col-7">{formatDate(invoice.dueDate)}</dd>
              <dt className="col-5">Ngày lập</dt>
              <dd className="col-7">{formatDate(invoice.createdDate)}</dd>
              <dt className="col-5">Ngày thanh toán</dt>
              <dd className="col-7">{formatDate(invoice.paidDate)}</dd>
              <dt className="col-5">Trạng thái</dt>
              <dd className="col-7">
                <StatusBadge type="invoice" value={invoice.displayStatus} />
              </dd>
              <dt className="col-5 fw-semibold">Tổng cộng</dt>
              <dd className="col-7 fw-semibold">
                {formatCurrency(invoice.total)}
              </dd>
            </dl>
          </Modal.Body>
        </>
      )}
    </Modal>
  );
}

export default function InvoicesPage() {
  const { data, loading, error, reload } = useFetch(fetchInvoiceData);
  const { showSuccess } = useToast();
  const [keyword, setKeyword] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [paidDate, setPaidDate] = useState(todayStr());
  const invoices = data?.invoices || EMPTY_ARRAY;
  const contracts = data?.contracts || EMPTY_ARRAY;
  const activeContracts = contracts.filter(
    (contract) => contract.status === 'active'
  );

  const filteredInvoices = useMemo(() => {
    const query = normalize(keyword);
    return invoices
      .filter((invoice) => {
        const searchable = normalize(
          `${invoice.room?.name || ''} ${invoice.tenant?.fullName || ''} ${
            invoice.tenant?.phone || ''
          } ${invoice.month}`
        );
        return (
          (!query || searchable.includes(query)) &&
          (!monthFilter || invoice.month === monthFilter) &&
          (statusFilter === 'all' || invoice.displayStatus === statusFilter)
        );
      })
      .sort((a, b) => b.month.localeCompare(a.month) || b.id - a.id);
  }, [invoices, keyword, monthFilter, statusFilter]);
  const { pageItems, page, setPage, totalPages } = usePagination(filteredInvoices);
  const totalAmount = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total || 0),
    0
  );
  const outstandingAmount = filteredInvoices
    .filter((invoice) => invoice.status !== 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const collectedAmount = filteredInvoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

  const openCreate = () => {
    setEditingInvoice(null);
    setFormOpen(true);
  };
  const openEdit = (invoice) => {
    setEditingInvoice(invoice);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditingInvoice(null);
  };
  const refreshAfterMutation = async () => {
    closeForm();
    await reload();
  };

  const confirmDelete = async () => {
    if (!deletingInvoice) return;
    await deleteInvoice(deletingInvoice.id);
    showSuccess(`Đã xóa hóa đơn tháng ${formatMonth(deletingInvoice.month)}`);
    setDeletingInvoice(null);
    await reload();
  };

  const confirmPayment = async () => {
    if (!payingInvoice) return;
    await payInvoice(payingInvoice.id, paidDate);
    showSuccess(`Đã ghi nhận thanh toán hóa đơn tháng ${formatMonth(payingInvoice.month)}`);
    setPayingInvoice(null);
    await reload();
  };

  return (
    <>
      <PageHeader
        title="Quản lý hóa đơn"
        description="Lập hóa đơn theo tháng, theo dõi tiền điện nước và công nợ."
        actions={
          <Button onClick={openCreate} disabled={!activeContracts.length}>
            Lập hóa đơn
          </Button>
        }
      />

      {data && !activeContracts.length && (
        <Alert variant="info">
          Chưa có hợp đồng đang hiệu lực để lập hóa đơn mới.
        </Alert>
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
        <Form.Group controlId="invoice-month-filter">
          <Form.Label className="visually-hidden">Lọc theo tháng</Form.Label>
          <Form.Control
            type="month"
            aria-label="Lọc theo tháng"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
          />
        </Form.Group>
        <Form.Group controlId="invoice-search" className="flex-grow-1">
          <Form.Label className="visually-hidden">Tìm hóa đơn</Form.Label>
          <Form.Control
            type="search"
            placeholder="Tìm theo phòng, người thuê, số điện thoại hoặc tháng"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </Form.Group>
      </Stack>

      {data && (
        <div className="d-flex flex-wrap gap-4 mb-3">
          <span>
            <strong>{filteredInvoices.length}</strong> hóa đơn
          </span>
          <span>
            Tổng hóa đơn: <strong>{formatCurrency(totalAmount)}</strong>
          </span>
          <span>
            Đã thu: <strong>{formatCurrency(collectedAmount)}</strong>
          </span>
          <span>
            Công nợ: <strong>{formatCurrency(outstandingAmount)}</strong>
          </span>
        </div>
      )}

      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        isEmpty={!loading && !error && filteredInvoices.length === 0}
        emptyMessage={
          invoices.length === 0
            ? 'Chưa có hóa đơn. Lập hóa đơn để ghi nhận tiền thuê và dịch vụ.'
            : 'Không tìm thấy hóa đơn phù hợp.'
        }
      >
        <div className="table-responsive rounded bg-white shadow-sm">
          <Table hover responsive className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Tháng</th>
                <th scope="col">Phòng</th>
                <th scope="col">Người thuê</th>
                <th scope="col" className="text-end">Điện (kWh)</th>
                <th scope="col" className="text-end">Nước (m³)</th>
                <th scope="col" className="text-end">Phí khác</th>
                <th scope="col">Hạn thanh toán</th>
                <th scope="col" className="text-end">Tổng tiền</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((invoice) => (
                <tr key={invoice.id}>
                  <th scope="row">{formatMonth(invoice.month)}</th>
                  <td>{invoice.room?.name || `#${invoice.roomId}`}</td>
                  <td>{invoice.tenant?.fullName || '—'}</td>
                  <td className="text-end">
                    {calcInvoice(invoice).electricUsed}
                  </td>
                  <td className="text-end">
                    {calcInvoice(invoice).waterUsed}
                  </td>
                  <td className="text-end text-nowrap">
                    {formatCurrency(invoice.otherFee)}
                  </td>
                  <td className="text-nowrap">{formatDate(invoice.dueDate)}</td>
                  <td className="text-end text-nowrap">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td>
                    <StatusBadge type="invoice" value={invoice.displayStatus} />
                  </td>
                  <td>
                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setViewingInvoice(invoice)}
                        aria-label={`Xem hóa đơn ${invoice.id}`}
                      >
                        Xem
                      </Button>
                      {invoice.status !== 'paid' && (
                        <>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => openEdit(invoice)}
                            aria-label={`Sửa hóa đơn ${invoice.id}`}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => setDeletingInvoice(invoice)}
                            aria-label={`Xóa hóa đơn ${invoice.id}`}
                          >
                            Xóa
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setPayingInvoice(invoice);
                              setPaidDate(todayStr());
                            }}
                            aria-label={`Thanh toán hóa đơn ${invoice.id}`}
                          >
                            Thanh toán
                          </Button>
                        </>
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
            {filteredInvoices.length} hóa đơn · Trang {page} / {totalPages}
          </small>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </DataState>

      {data && (
        <InvoiceFormModal
          key={`${formOpen ? 'open' : 'closed'}-${editingInvoice?.id ?? 'new'}`}
          show={formOpen}
          invoice={editingInvoice}
          contracts={activeContracts}
          onSaved={refreshAfterMutation}
          onCancel={closeForm}
        />
      )}

      <ConfirmModal
        show={Boolean(deletingInvoice)}
        title="Xác nhận xóa hóa đơn"
        message={
          deletingInvoice
            ? `Xóa hóa đơn tháng ${formatMonth(deletingInvoice.month)} của phòng ${
                deletingInvoice.room?.name || `#${deletingInvoice.roomId}`
              }? Chỉ có thể xóa hóa đơn chưa thanh toán mới nhất của hợp đồng.`
            : ''
        }
        confirmText="Xóa hóa đơn"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingInvoice(null)}
      />

      <ConfirmModal
        show={Boolean(payingInvoice)}
        title="Xác nhận thanh toán"
        message={
          payingInvoice ? (
            <>
              <p>
                Ghi nhận thanh toán {formatCurrency(payingInvoice.total)} cho hóa
                đơn tháng {formatMonth(payingInvoice.month)}?
              </p>
              <Form.Group controlId="invoice-paid-date">
                <Form.Label>Ngày thanh toán</Form.Label>
                <Form.Control
                  type="date"
                  aria-label="Ngày thanh toán"
                  min={payingInvoice.createdDate}
                  max={todayStr()}
                  value={paidDate}
                  onChange={(event) => setPaidDate(event.target.value)}
                />
              </Form.Group>
            </>
          ) : (
            ''
          )
        }
        confirmText="Xác nhận thanh toán"
        onConfirm={confirmPayment}
        onCancel={() => setPayingInvoice(null)}
      />

      <InvoiceDetailsModal
        invoice={viewingInvoice}
        onHide={() => setViewingInvoice(null)}
      />
    </>
  );
}
