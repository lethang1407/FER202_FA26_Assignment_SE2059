import { contractApi } from '../api/contractApi';
import { tenantApi } from '../api/tenantApi';
import { AppError } from '../utils/AppError';
import { cleanSpaces } from '../utils/text';

const makePayload = (values) => ({
  fullName: cleanSpaces(values.fullName),
  phone: String(values.phone ?? '').trim(),
  idCard: String(values.idCard ?? '').trim(),
  hometown: cleanSpaces(values.hometown),
});

async function assertUniqueIdentifiers(data, ignoreId) {
  const tenants = await tenantApi.getAll();
  const otherTenants = tenants.filter(
    (tenant) => String(tenant.id) !== String(ignoreId)
  );

  if (otherTenants.some((tenant) => tenant.phone === data.phone)) {
    throw new AppError('Số điện thoại đã được dùng bởi người thuê khác');
  }
  if (otherTenants.some((tenant) => tenant.idCard === data.idCard)) {
    throw new AppError('CCCD đã tồn tại');
  }
}

export async function createTenant(values) {
  const data = makePayload(values);
  await assertUniqueIdentifiers(data);
  return tenantApi.create(data);
}

export async function updateTenant(id, values) {
  const current = await tenantApi.getById(id);
  const data = makePayload(values);
  await assertUniqueIdentifiers(data, id);
  return tenantApi.update(id, { ...current, ...data });
}

export async function deleteTenant(id) {
  const contracts = await contractApi.getAll({ tenantId: id });
  if (contracts.some((contract) => contract.status === 'active')) {
    throw new AppError('Không thể xóa: người thuê đang có hợp đồng hiệu lực');
  }
  if (contracts.length > 0) {
    throw new AppError('Không thể xóa: người thuê đã có lịch sử hợp đồng');
  }

  return tenantApi.remove(id);
}
