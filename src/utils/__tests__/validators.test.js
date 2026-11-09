import { validateRoom } from '../validators';

const existingRooms = [
  {
    id: 1,
    name: 'P101',
    floor: 1,
    area: 20,
    price: 2500000,
    status: 'occupied',
  },
];

const validRoom = {
  name: 'P103',
  floor: '1',
  area: '22',
  price: '2800000',
  status: 'available',
  description: '',
};

describe('validateRoom', () => {
  test('accepts valid room data and allows the current room name when editing', () => {
    expect(validateRoom(validRoom, existingRooms)).toEqual({});
    expect(
      validateRoom({ ...validRoom, name: 'P101' }, existingRooms, 1)
    ).toEqual({});
  });

  test('rejects missing, malformed, too long, and duplicate names', () => {
    expect(validateRoom({ ...validRoom, name: ' ' }, existingRooms).name).toBe(
      'Vui lòng nhập tên phòng'
    );
    expect(validateRoom({ ...validRoom, name: 'A' }, existingRooms).name).toBeTruthy();
    expect(
      validateRoom({ ...validRoom, name: 'P101' }, existingRooms).name
    ).toBe('Tên phòng đã tồn tại');
    expect(
      validateRoom({ ...validRoom, name: 'P@103' }, existingRooms).name
    ).toBeTruthy();
  });

  test.each([
    ['floor', '0'],
    ['floor', '51'],
    ['floor', '1.5'],
    ['floor', 'abc'],
    ['floor', ''],
    ['area', '0'],
    ['area', '-5'],
    ['area', '201'],
    ['area', 'abc'],
    ['area', ''],
    ['price', '99999'],
    ['price', '100000001'],
    ['price', '2500000.5'],
    ['price', ''],
  ])('rejects invalid %s value %s', (field, value) => {
    expect(validateRoom({ ...validRoom, [field]: value }, existingRooms)[field]).toBeTruthy();
  });

  test('rejects invalid status and descriptions over 200 characters', () => {
    expect(
      validateRoom({ ...validRoom, status: 'unknown' }, existingRooms).status
    ).toBe('Trạng thái không hợp lệ');
    expect(
      validateRoom({ ...validRoom, description: 'x'.repeat(201) }, existingRooms)
        .description
    ).toBe('Mô tả tối đa 200 ký tự');
  });
});
