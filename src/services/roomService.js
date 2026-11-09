import { contractApi } from '../api/contractApi';
import { roomApi } from '../api/roomApi';
import { AppError } from '../utils/AppError';
import { ROOM_STATUS } from '../utils/constants';
import { cleanSpaces } from '../utils/text';

const makePayload = (values) => ({
  name: cleanSpaces(values.name),
  floor: Number(values.floor),
  area: Number(values.area),
  price: Number(values.price),
  status: values.status,
  description: cleanSpaces(values.description),
});

async function assertNameUnique(name, ignoreId) {
  const rooms = await roomApi.getAll();
  const normalizedName = cleanSpaces(name).toLocaleLowerCase('vi');
  const duplicate = rooms.some(
    (room) =>
      String(room.id) !== String(ignoreId) &&
      cleanSpaces(room.name).toLocaleLowerCase('vi') === normalizedName
  );

  if (duplicate) throw new AppError('Tên phòng đã tồn tại');
}

export async function createRoom(values) {
  const data = makePayload(values);
  if (!Object.values(ROOM_STATUS).includes(data.status)) {
    throw new AppError('Trạng thái không hợp lệ');
  }
  if (data.status === ROOM_STATUS.OCCUPIED) {
    throw new AppError('Trạng thái "Đang thuê" chỉ được đặt khi tạo hợp đồng');
  }

  await assertNameUnique(data.name);
  return roomApi.create(data);
}

export async function updateRoom(id, values) {
  const current = await roomApi.getById(id);
  const data = makePayload(values);
  if (!Object.values(ROOM_STATUS).includes(data.status)) {
    throw new AppError('Trạng thái không hợp lệ');
  }

  if (current.status === ROOM_STATUS.OCCUPIED && data.status !== ROOM_STATUS.OCCUPIED) {
    throw new AppError(
      'Phòng đang có người thuê. Hãy kết thúc hợp đồng trước khi đổi trạng thái'
    );
  }

  if (current.status !== ROOM_STATUS.OCCUPIED && data.status === ROOM_STATUS.OCCUPIED) {
    throw new AppError('Trạng thái "Đang thuê" chỉ được đặt khi tạo hợp đồng');
  }

  await assertNameUnique(data.name, id);
  return roomApi.update(id, { ...current, ...data });
}

export async function deleteRoom(id) {
  const contracts = await contractApi.getAll({ roomId: id });
  if (contracts.some((contract) => contract.status === 'active')) {
    throw new AppError('Không thể xóa: phòng đang có hợp đồng hiệu lực');
  }
  if (contracts.length > 0) {
    throw new AppError(
      'Không thể xóa: phòng đã có lịch sử hợp đồng. Bạn có thể chuyển phòng sang "Đang sửa"'
    );
  }

  return roomApi.remove(id);
}
