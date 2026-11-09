import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Stack,
  Table,
} from 'react-bootstrap';
import { contractApi } from '../../api/contractApi';
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
import { createRoom, deleteRoom, updateRoom } from '../../services/roomService';
import { ROOM_STATUS } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';
import { normalize } from '../../utils/text';
import RoomFormModal from './RoomFormModal';

const EMPTY_ROOMS = [];

async function fetchRoomData() {
  const [rooms, contracts, tenants] = await Promise.all([
    roomApi.getAll(),
    contractApi.getAll({ status: 'active' }),
    tenantApi.getAll(),
  ]);
  const tenantsById = new Map(tenants.map((tenant) => [String(tenant.id), tenant]));
  const contractsByRoomId = new Map(
    contracts.map((contract) => [
      String(contract.roomId),
      { ...contract, tenant: tenantsById.get(String(contract.tenantId)) },
    ])
  );

  return { rooms, contractsByRoomId };
}

export default function RoomsPage() {
  const { data, loading, error, reload } = useFetch(fetchRoomData);
  const { showSuccess } = useToast();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const rooms = data ? data.rooms : EMPTY_ROOMS;

  const floors = useMemo(
    () => [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const normalizedKeyword = normalize(keyword);
    return rooms
      .filter((room) => {
        const matchesKeyword =
          !normalizedKeyword ||
          normalize(room.name).includes(normalizedKeyword);
        const matchesStatus = !statusFilter || room.status === statusFilter;
        const matchesFloor = !floorFilter || String(room.floor) === floorFilter;
        return matchesKeyword && matchesStatus && matchesFloor;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
  }, [rooms, keyword, statusFilter, floorFilter]);

  const { pageItems, page, setPage, totalPages } = usePagination(filteredRooms);

  const openCreate = () => {
    setEditingRoom(null);
    setFormOpen(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingRoom(null);
  };

  const saveRoom = async (values) => {
    if (editingRoom) {
      await updateRoom(editingRoom.id, values);
      showSuccess(`Đã cập nhật phòng ${values.name}`);
    } else {
      await createRoom(values);
      showSuccess(`Đã thêm phòng ${values.name}`);
    }
    closeForm();
    await reload();
  };

  const removeRoom = useCallback(async () => {
    if (!deletingRoom) return;

    await deleteRoom(deletingRoom.id);
    showSuccess(`Đã xóa phòng ${deletingRoom.name}`);
    setDeletingRoom(null);
    await reload();
  }, [deletingRoom, reload, showSuccess]);

  return (
    <>
      <PageHeader
        title="Quản lý phòng"
        description="Theo dõi danh sách, giá thuê và tình trạng phòng."
        actions={<Button onClick={openCreate}>Thêm phòng</Button>}
      />

      <Stack direction="horizontal" gap={3} className="align-items-end mb-3 flex-wrap">
        <Form.Group controlId="room-search" className="flex-grow-1">
          <Form.Label>Tìm theo tên phòng</Form.Label>
          <Form.Control
            type="search"
            placeholder="Nhập tên phòng"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </Form.Group>
        <Form.Group controlId="room-filter-status">
          <Form.Label>Trạng thái</Form.Label>
          <Form.Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Tất cả</option>
            <option value={ROOM_STATUS.AVAILABLE}>Trống</option>
            <option value={ROOM_STATUS.OCCUPIED}>Đang thuê</option>
            <option value={ROOM_STATUS.MAINTENANCE}>Đang sửa</option>
          </Form.Select>
        </Form.Group>
        <Form.Group controlId="room-filter-floor">
          <Form.Label>Tầng</Form.Label>
          <Form.Select
            value={floorFilter}
            onChange={(event) => setFloorFilter(event.target.value)}
          >
            <option value="">Tất cả</option>
            {floors.map((floor) => (
              <option value={floor} key={floor}>
                Tầng {floor}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Stack>

      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        isEmpty={!loading && !error && filteredRooms.length === 0}
        emptyMessage={
          rooms.length === 0
            ? 'Chưa có phòng. Hãy thêm phòng mới để bắt đầu.'
            : 'Không tìm thấy phòng phù hợp với điều kiện lọc.'
        }
      >
        <div className="table-responsive rounded bg-white shadow-sm">
          <Table hover responsive className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Tên phòng</th>
                <th scope="col" className="text-end">Tầng</th>
                <th scope="col" className="text-end">Diện tích</th>
                <th scope="col" className="text-end">Giá thuê/tháng</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Người đang thuê</th>
                <th scope="col" className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((room) => {
                const tenant = data.contractsByRoomId.get(String(room.id))?.tenant;
                return (
                  <tr key={room.id}>
                    <th scope="row">
                      <div>{room.name}</div>
                      {room.description && (
                        <small className="text-secondary fw-normal">
                          {room.description}
                        </small>
                      )}
                    </th>
                    <td className="text-end">{room.floor}</td>
                    <td className="text-end">{room.area} m²</td>
                    <td className="text-end text-nowrap">
                      {formatCurrency(room.price)}
                    </td>
                    <td>
                      <StatusBadge type="room" value={room.status} />
                    </td>
                    <td>{tenant?.fullName || '—'}</td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => openEdit(room)}
                          aria-label={`Sửa phòng ${room.name}`}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => setDeletingRoom(room)}
                          aria-label={`Xóa phòng ${room.name}`}
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
            {filteredRooms.length} phòng · Trang {page} / {totalPages}
          </small>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </DataState>

      <RoomFormModal
        key={`${formOpen ? 'open' : 'closed'}-${editingRoom?.id ?? 'new'}`}
        show={formOpen}
        room={editingRoom}
        rooms={rooms}
        onSave={saveRoom}
        onCancel={closeForm}
      />

      <ConfirmModal
        show={Boolean(deletingRoom)}
        title="Xác nhận xóa phòng"
        message={
          deletingRoom
            ? `Bạn có chắc muốn xóa phòng ${deletingRoom.name}? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa phòng"
        variant="danger"
        onConfirm={removeRoom}
        onCancel={() => setDeletingRoom(null)}
      />
    </>
  );
}
