import { addDays, addMonths, todayStr } from '../date';
import {
  validateContractCreate,
  validateContractUpdate,
} from '../validators';

const room = { id: 1, price: 2500000 };

function validContract() {
  const startDate = todayStr();
  return {
    roomId: '1',
    tenantId: '2',
    startDate,
    endDate: addMonths(startDate, 12),
    deposit: '2500000',
  };
}

describe('contract validators', () => {
  test('accepts a valid contract and deposit up to three months of rent', () => {
    expect(validateContractCreate(validContract(), room)).toEqual({});
    expect(
      validateContractCreate({ ...validContract(), deposit: '7500000' }, room)
    ).toEqual({});
  });

  test('requires a room, tenant, valid dates, and a minimum 30-day term', () => {
    const values = validContract();
    expect(
      validateContractCreate(
        {
          ...values,
          roomId: '',
          tenantId: '',
          startDate: '',
          endDate: '',
        },
        room
      )
    ).toMatchObject({
      roomId: 'Vui lòng chọn phòng',
      tenantId: 'Vui lòng chọn người thuê',
      startDate: 'Vui lòng chọn ngày bắt đầu',
      endDate: 'Vui lòng chọn ngày kết thúc',
    });

    expect(
      validateContractCreate(
        {
          ...values,
          endDate: addDays(values.startDate, 29),
        },
        room
      ).endDate
    ).toBe('Hợp đồng phải kéo dài tối thiểu 30 ngày');
  });

  test('limits start date and validates deposit', () => {
    const values = validContract();
    expect(
      validateContractCreate(
        { ...values, startDate: addDays(todayStr(), 91) },
        room
      ).startDate
    ).toBeTruthy();
    expect(
      validateContractCreate({ ...values, deposit: '-1' }, room).deposit
    ).toBeTruthy();
    expect(
      validateContractCreate({ ...values, deposit: '7500001' }, room).deposit
    ).toBe('Tiền cọc không được vượt quá 3 tháng tiền phòng');
  });

  test('validates edits against contract start and room rent', () => {
    const contract = { startDate: '2026-01-01' };
    expect(
      validateContractUpdate(
        { endDate: '2026-01-20', deposit: '1000' },
        contract,
        room
      )
    ).toMatchObject({
      endDate: 'Hợp đồng phải kéo dài tối thiểu 30 ngày',
    });
    expect(
      validateContractUpdate(
        { endDate: '2026-12-31', deposit: '7500001' },
        contract,
        room
      ).deposit
    ).toBeTruthy();
  });
});
