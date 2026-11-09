import { useMemo, useState } from 'react';
import { Button, Form, Stack, Table } from 'react-bootstrap';
import { contractApi } from '../../api/contractApi';
import { roomApi } from '../../api/roomApi';
import { tenantApi } from '../../api/tenantApi';
import ConfirmModal from '../../components/common/ConfirmModal';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { usePagination } from '../../hooks/usePagination';
import { deleteTenant, createTenant, updateTenant } from '../../services/tenantService';
import { normalize } from '../../utils/text';
import TenantFormModal from './TenantFormModal';

const EMPTY_TENANTS = [];

async function fetchTenantData() {
  const [tenants, contracts, rooms] = await Promise.all([
    tenantApi.getAll(),
    contractApi.getAll({ status: 'active' }),
    roomApi.getAll(),
  ]);
  const roomsById = new Map(rooms.map((room) => [String(room.id), room]));
  const contractsByTenantId = new Map(
    contracts.map((contract) => [
      String(contract.tenantId),
      { ...contract, room: roomsById.get(String(contract.roomId)) },
    ])
  );

  return { tenants, contractsByTenantId };
}

export default function TenantsPage() {
  const { data, loading, error, reload } = useFetch(fetchTenantData);
  const { showSuccess } = useToast();
  const [keyword, setKeyword] = useState('');
  const [editingTenant, setEditingTenant] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState(null);
  const tenants = data ? data.tenants : EMPTY_TENANTS;

  const filteredTenants = useMemo(() => {
    const normalizedKeyword = normalize(keyword);
    return tenants
      .filter(
        (tenant) =>
          !normalizedKeyword ||
          normalize(tenant.fullName).includes(normalizedKeyword) ||
          normalize(tenant.phone).includes(normalizedKeyword) ||
          normalize(tenant.idCard).includes(normalizedKeyword)
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }, [tenants, keyword]);

  const { pageItems, page, setPage, totalPages } = usePagination(filteredTenants);

  const openCreate = () => {
    setEditingTenant(null);
    setFormOpen(true);
  };

  const openEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingTenant(null);
  };

  const saveTenant = async (values) => {
    if (editingTenant) {
      await updateTenant(editingTenant.id, values);
      showSuccess(`Đã cập nhật người thuê ${values.fullName.trim()}`);
    } else {
      await createTenant(values);
      showSuccess(`Đã thêm người thuê ${values.fullName.trim()}`);
    }
    closeForm();
    await reload();
  };

  const removeTenant = async () => {
    if (!deletingTenant) return;

    await deleteTenant(deletingTenant.id);
    showSuccess(`Đã xóa người thuê ${deletingTenant.fullName}`);
    setDeletingTenant(null);
    await reload();
  };

  return (
    <>
      <PageHeader
        title="Quản lý người thuê"
        description="Tra cứu và cập nhật thông tin người thuê."
        actions={<Button onClick={openCreate}>Thêm người thuê</Button>}
      />

      <Stack direction="horizontal" className="mb-3">
        <Form.Group controlId="tenant-search" className="w-100">
          <Form.Label>Tìm theo tên, số điện thoại hoặc CCCD</Form.Label>
          <Form.Control
            type="search"
            placeholder="Có thể tìm tên không dấu"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </Form.Group>
      </Stack>

      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        isEmpty={!loading && !error && filteredTenants.length === 0}
        emptyMessage={
          tenants.length === 0
            ? 'Chưa có người thuê. Hãy thêm người thuê mới để bắt đầu.'
            : 'Không tìm thấy người thuê phù hợp.'
        }
      >
        <div className="table-responsive rounded bg-white shadow-sm">
          <Table hover responsive className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Họ tên</th>
                <th scope="col">Số điện thoại</th>
                <th scope="col">CCCD</th>
                <th scope="col">Quê quán</th>
                <th scope="col">Phòng đang thuê</th>
                <th scope="col" className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((tenant) => {
                const currentRoom = data.contractsByTenantId.get(
                  String(tenant.id)
                )?.room;

                return (
                  <tr key={tenant.id}>
                    <th scope="row">{tenant.fullName}</th>
                    <td>{tenant.phone}</td>
                    <td>{tenant.idCard}</td>
                    <td>{tenant.hometown}</td>
                    <td>{currentRoom?.name || '—'}</td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => openEdit(tenant)}
                          aria-label={`Sửa người thuê ${tenant.fullName}`}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => setDeletingTenant(tenant)}
                          aria-label={`Xóa người thuê ${tenant.fullName}`}
                        >
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
        <div className="d-flex justify-content-between align-items-center gap-3 mt-3">
          <small className="text-secondary">
            {filteredTenants.length} người thuê · Trang {page} / {totalPages}
          </small>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </DataState>

      <TenantFormModal
        key={`${formOpen ? 'open' : 'closed'}-${editingTenant?.id ?? 'new'}`}
        show={formOpen}
        tenant={editingTenant}
        tenants={tenants}
        onSave={saveTenant}
        onCancel={closeForm}
      />

      <ConfirmModal
        show={Boolean(deletingTenant)}
        title="Xác nhận xóa người thuê"
        message={
          deletingTenant
            ? `Bạn có chắc muốn xóa người thuê ${deletingTenant.fullName}? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa người thuê"
        variant="danger"
        onConfirm={removeTenant}
        onCancel={() => setDeletingTenant(null)}
      />
    </>
  );
}
