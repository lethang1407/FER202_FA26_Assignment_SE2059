import { contractApi } from '../api/contractApi';
import { invoiceApi } from '../api/invoiceApi';
import { roomApi } from '../api/roomApi';
import { tenantApi } from '../api/tenantApi';
import { AppError } from '../utils/AppError';
import { ROOM_STATUS } from '../utils/constants';
import { daysBetween, formatMonth, isValidDateStr, todayStr } from '../utils/date';
import { validateContractCreate, validateContractUpdate } from '../utils/validators';

function assertValid(errors) {
  const firstError = Object.values(errors)[0];
  if (firstError) throw new AppError(firstError);
}

function assertRollbackSucceeded(error, rollbackError, action) {
  if (rollbackError) {
    throw new AppError(
      `${action} thất bại và không thể hoàn tác tự động. Dữ liệu có thể chưa đồng bộ; hãy tải lại trang và kiểm tra phòng/hợp đồng.`
    );
  }

  throw error;
}

export async function createContract(values) {
  const roomId = Number(values.roomId);
  const tenantId = Number(values.tenantId);
  if (!Number.isInteger(roomId) || !Number.isInteger(tenantId)) {
    throw new AppError('Vui lòng chọn phòng và người thuê hợp lệ');
  }

  const [room, tenant, activeContracts] = await Promise.all([
    roomApi.getById(roomId),
    tenantApi.getById(tenantId),
    contractApi.getAll({ status: 'active' }),
  ]);
  assertValid(validateContractCreate(values, room));

  if (room.status !== ROOM_STATUS.AVAILABLE) {
    throw new AppError('Phòng này không còn trống. Vui lòng chọn phòng khác');
  }
  if (activeContracts.some((contract) => String(contract.roomId) === String(roomId))) {
    throw new AppError('Phòng này đang có hợp đồng hiệu lực');
  }
  if (
    activeContracts.some(
      (contract) => String(contract.tenantId) === String(tenant.id)
    )
  ) {
    throw new AppError('Người thuê này đang có hợp đồng hiệu lực');
  }

  const contract = await contractApi.create({
    roomId,
    tenantId: tenant.id,
    startDate: values.startDate,
    endDate: values.endDate,
    deposit: Number(values.deposit),
    status: 'active',
    endedDate: null,
  });

  try {
    await roomApi.patch(roomId, { status: ROOM_STATUS.OCCUPIED });
  } catch (error) {
    try {
      await contractApi.remove(contract.id);
    } catch (rollbackError) {
      assertRollbackSucceeded(error, rollbackError, 'Tạo hợp đồng');
    }
    throw error;
  }

  return contract;
}

export async function endContract(id) {
  const contract = await contractApi.getById(id);
  if (contract.status !== 'active') {
    throw new AppError('Hợp đồng đã được kết thúc trước đó');
  }

  const unpaid = await invoiceApi.getAll({ contractId: id, status: 'unpaid' });
  if (unpaid.length > 0) {
    throw new AppError(
      `Còn ${unpaid.length} hóa đơn chưa thanh toán. Vui lòng thu tiền trước khi kết thúc hợp đồng`
    );
  }

  await contractApi.patch(id, { status: 'ended', endedDate: todayStr() });
  try {
    await roomApi.patch(contract.roomId, { status: ROOM_STATUS.AVAILABLE });
  } catch (error) {
    try {
      await contractApi.patch(id, { status: 'active', endedDate: null });
    } catch (rollbackError) {
      assertRollbackSucceeded(error, rollbackError, 'Kết thúc hợp đồng');
    }
    throw error;
  }
}

export async function updateContract(id, values) {
  const contract = await contractApi.getById(id);
  if (contract.status !== 'active') {
    throw new AppError('Chỉ có thể sửa hợp đồng đang hiệu lực');
  }

  const [room, invoices] = await Promise.all([
    roomApi.getById(contract.roomId),
    invoiceApi.getAll({ contractId: id }),
  ]);
  assertValid(validateContractUpdate(values, contract, room));

  const latestMonth = invoices
    .map((invoice) => invoice.month)
    .sort()
    .pop();
  if (latestMonth && values.endDate.slice(0, 7) < latestMonth) {
    throw new AppError(
      `Ngày kết thúc không được sớm hơn kỳ hóa đơn đã lập (${formatMonth(latestMonth)})`
    );
  }

  if (!isValidDateStr(contract.startDate) || daysBetween(contract.startDate, values.endDate) < 30) {
    throw new AppError('Hợp đồng phải kéo dài tối thiểu 30 ngày');
  }

  return contractApi.patch(id, {
    endDate: values.endDate,
    deposit: Number(values.deposit),
  });
}
