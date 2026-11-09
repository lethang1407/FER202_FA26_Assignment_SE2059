import { contractApi } from '../../api/contractApi';
import { roomApi } from '../../api/roomApi';
import { createRoom, deleteRoom, updateRoom } from '../roomService';

jest.mock('../../api/roomApi', () => ({
  roomApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../../api/contractApi', () => ({
  contractApi: {
    getAll: jest.fn(),
  },
}));

const validRoom = {
  name: ' P103 ',
  floor: '1',
  area: '22',
  price: '2800000',
  status: 'available',
  description: '  Phòng   rộng  ',
};

describe('room service business rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes and creates a room after checking the latest names', async () => {
    roomApi.getAll.mockResolvedValue([{ id: 1, name: 'P101' }]);
    roomApi.create.mockResolvedValue({ id: 2, name: 'P103' });

    await expect(createRoom(validRoom)).resolves.toEqual({ id: 2, name: 'P103' });
    expect(roomApi.create).toHaveBeenCalledWith({
      name: 'P103',
      floor: 1,
      area: 22,
      price: 2800000,
      status: 'available',
      description: 'Phòng rộng',
    });
  });

  test('blocks duplicate names and setting occupied status manually', async () => {
    roomApi.getAll.mockResolvedValue([{ id: 1, name: 'P103' }]);
    await expect(createRoom(validRoom)).rejects.toThrow('Tên phòng đã tồn tại');
    expect(roomApi.create).not.toHaveBeenCalled();

    await expect(
      createRoom({ ...validRoom, status: 'occupied' })
    ).rejects.toThrow('chỉ được đặt khi tạo hợp đồng');
  });

  test('blocks changing the status of an occupied room', async () => {
    roomApi.getById.mockResolvedValue({ id: 1, name: 'P101', status: 'occupied' });

    await expect(
      updateRoom(1, { ...validRoom, status: 'available' })
    ).rejects.toThrow('Hãy kết thúc hợp đồng trước');
    expect(roomApi.update).not.toHaveBeenCalled();
  });

  test('blocks deletion with active or historical contracts', async () => {
    contractApi.getAll.mockResolvedValue([{ id: 1, status: 'active' }]);
    await expect(deleteRoom(1)).rejects.toThrow('đang có hợp đồng hiệu lực');

    contractApi.getAll.mockResolvedValue([{ id: 2, status: 'ended' }]);
    await expect(deleteRoom(1)).rejects.toThrow('đã có lịch sử hợp đồng');
    expect(roomApi.remove).not.toHaveBeenCalled();
  });

  test('deletes a room with no contract history', async () => {
    contractApi.getAll.mockResolvedValue([]);
    roomApi.remove.mockResolvedValue(undefined);

    await expect(deleteRoom(3)).resolves.toBeUndefined();
    expect(roomApi.remove).toHaveBeenCalledWith(3);
  });
});
