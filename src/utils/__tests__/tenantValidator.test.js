import { validateTenant } from '../validators';

const tenants = [
  {
    id: 1,
    fullName: 'Nguyễn Văn An',
    phone: '0901234567',
    idCard: '001201000001',
    hometown: 'Hà Nam',
  },
];

const validTenant = {
  fullName: 'Nguyễn Văn Bình',
  phone: '0912345678',
  idCard: '001301000002',
  hometown: 'Nam Định',
};

describe('validateTenant', () => {
  test('accepts valid details and allows unchanged identifiers when editing', () => {
    expect(validateTenant(validTenant, tenants)).toEqual({});
    expect(
      validateTenant(
        {
          ...validTenant,
          phone: tenants[0].phone,
          idCard: tenants[0].idCard,
        },
        tenants,
        1
      )
    ).toEqual({});
  });

  test.each(['', 'A', 'An123'])(
    'rejects invalid full name "%s"',
    (fullName) => {
      expect(validateTenant({ ...validTenant, fullName }, tenants).fullName).toBeTruthy();
    }
  );

  test('accepts names with extra whitespace because they are normalized on save', () => {
    expect(
      validateTenant({ ...validTenant, fullName: ' Nguyễn  Văn An ' }, tenants)
    ).toEqual({});
  });

  test.each(['', '0123456789', '090123456', '09012345678', 'abc'])(
    'rejects invalid phone "%s"',
    (phone) => {
      expect(validateTenant({ ...validTenant, phone }, tenants).phone).toBeTruthy();
    }
  );

  test('rejects duplicate phone and CCCD', () => {
    expect(
      validateTenant({ ...validTenant, phone: tenants[0].phone }, tenants).phone
    ).toBe('Số điện thoại đã được dùng bởi người thuê khác');
    expect(
      validateTenant({ ...validTenant, idCard: tenants[0].idCard }, tenants).idCard
    ).toBe('CCCD đã tồn tại');
  });

  test.each(['12345678901', '1234567890123', '12345678901a'])(
    'rejects invalid CCCD "%s"',
    (idCard) => {
      expect(validateTenant({ ...validTenant, idCard }, tenants).idCard).toBeTruthy();
    }
  );

  test.each(['', 'x'.repeat(101)])('rejects invalid hometown length', (hometown) => {
    expect(validateTenant({ ...validTenant, hometown }, tenants).hometown).toBeTruthy();
  });
});
