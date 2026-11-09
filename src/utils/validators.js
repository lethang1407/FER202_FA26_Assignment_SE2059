import { ROOM_STATUS } from './constants';
import { cleanSpaces } from './text';
import {
  addDays,
  currentMonthStr,
  daysBetween,
  isValidDateStr,
  todayStr,
} from './date';

export function validateRoom(values, rooms, editingId = null) {
  const errors = {};
  const name = cleanSpaces(values.name);
  const floor = Number(values.floor);
  const area = Number(values.area);
  const price = Number(values.price);
  const statusValues = Object.values(ROOM_STATUS);

  if (!name) {
    errors.name = 'Vui lòng nhập tên phòng';
  } else if (!/^[\p{L}\p{N} -]{2,20}$/u.test(name)) {
    errors.name = 'Tên phòng gồm 2–20 ký tự (chữ, số, khoảng trắng, dấu -)';
  } else if (
    rooms.some(
      (room) =>
        String(room.id) !== String(editingId) &&
        cleanSpaces(room.name).toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')
    )
  ) {
    errors.name = 'Tên phòng đã tồn tại';
  }

  if (
    values.floor === '' ||
    !Number.isInteger(floor) ||
    floor < 1 ||
    floor > 50
  ) {
    errors.floor = 'Tầng phải là số nguyên từ 1 đến 50';
  }

  if (values.area === '' || !Number.isFinite(area) || area <= 0 || area > 200) {
    errors.area = 'Diện tích phải lớn hơn 0 và không quá 200 m²';
  }

  if (
    values.price === '' ||
    !Number.isInteger(price) ||
    price < 100000 ||
    price > 100000000
  ) {
    errors.price = 'Giá thuê phải từ 100.000 đến 100.000.000 ₫';
  }

  if (!statusValues.includes(values.status)) {
    errors.status = 'Trạng thái không hợp lệ';
  }

  if (String(values.description ?? '').length > 200) {
    errors.description = 'Mô tả tối đa 200 ký tự';
  }

  return errors;
}

export function validateTenant(values, tenants, editingId = null) {
  const errors = {};
  const fullName = cleanSpaces(values.fullName);
  const phone = String(values.phone ?? '').trim();
  const idCard = String(values.idCard ?? '').trim();
  const hometown = cleanSpaces(values.hometown);
  const isOtherTenant = (tenant) => String(tenant.id) !== String(editingId);

  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ tên';
  } else if (!/^[\p{L} ]{2,50}$/u.test(fullName)) {
    errors.fullName = 'Họ tên chỉ gồm chữ cái, từ 2 đến 50 ký tự';
  }

  if (!phone) {
    errors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!/^0[35789]\d{8}$/.test(phone)) {
    errors.phone =
      'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09';
  } else if (tenants.some((tenant) => isOtherTenant(tenant) && tenant.phone === phone)) {
    errors.phone = 'Số điện thoại đã được dùng bởi người thuê khác';
  }

  if (!/^\d{12}$/.test(idCard)) {
    errors.idCard = 'CCCD phải gồm đúng 12 chữ số';
  } else if (tenants.some((tenant) => isOtherTenant(tenant) && tenant.idCard === idCard)) {
    errors.idCard = 'CCCD đã tồn tại';
  }

  if (!hometown || hometown.length > 100) {
    errors.hometown = 'Vui lòng nhập quê quán (tối đa 100 ký tự)';
  }

  return errors;
}

export function validateContractCreate(values, room) {
  const errors = {};
  const today = todayStr();

  if (!values.roomId) errors.roomId = 'Vui lòng chọn phòng';
  if (!values.tenantId) errors.tenantId = 'Vui lòng chọn người thuê';

  if (!isValidDateStr(values.startDate)) {
    errors.startDate = 'Vui lòng chọn ngày bắt đầu';
  } else if (
    values.startDate < addDays(today, -30) ||
    values.startDate > addDays(today, 90)
  ) {
    errors.startDate =
      'Ngày bắt đầu chỉ được trong khoảng 30 ngày trước đến 90 ngày sau hôm nay';
  }

  if (!isValidDateStr(values.endDate)) {
    errors.endDate = 'Vui lòng chọn ngày kết thúc';
  } else if (
    isValidDateStr(values.startDate) &&
    daysBetween(values.startDate, values.endDate) < 30
  ) {
    errors.endDate = 'Hợp đồng phải kéo dài tối thiểu 30 ngày';
  }

  const deposit = Number(values.deposit);
  if (
    values.deposit === '' ||
    !Number.isInteger(deposit) ||
    deposit < 0
  ) {
    errors.deposit = 'Tiền cọc phải là số nguyên không âm';
  } else if (room && deposit > room.price * 3) {
    errors.deposit = 'Tiền cọc không được vượt quá 3 tháng tiền phòng';
  }

  return errors;
}

export function validateContractUpdate(values, contract, room) {
  const errors = {};
  const endDate = values.endDate;
  const deposit = Number(values.deposit);

  if (!isValidDateStr(endDate)) {
    errors.endDate = 'Vui lòng chọn ngày kết thúc';
  } else if (
    contract &&
    daysBetween(contract.startDate, endDate) < 30
  ) {
    errors.endDate = 'Hợp đồng phải kéo dài tối thiểu 30 ngày';
  }

  if (
    values.deposit === '' ||
    !Number.isInteger(deposit) ||
    deposit < 0
  ) {
    errors.deposit = 'Tiền cọc phải là số nguyên không âm';
  } else if (room && deposit > room.price * 3) {
    errors.deposit = 'Tiền cọc không được vượt quá 3 tháng tiền phòng';
  }

  return errors;
}

export function validateInvoice(values, context = {}) {
  const errors = {};
  const isInteger = (value) =>
    value !== '' && Number.isInteger(Number(value));
  const number = Number;
  const contract = context.contract;
  const validMonth =
    /^\d{4}-(0[1-9]|1[0-2])$/.test(values.month || '') &&
    isValidDateStr(`${values.month}-01`);

  if (!values.contractId) {
    errors.contractId = 'Vui lòng chọn hợp đồng đang hiệu lực';
  } else if (contract && contract.status !== 'active') {
    errors.contractId = 'Vui lòng chọn hợp đồng đang hiệu lực';
  }

  if (!validMonth) {
    errors.month = 'Vui lòng chọn tháng hợp lệ';
  } else if (contract) {
    const minMonth = contract.startDate.slice(0, 7);
    const maxMonth = [contract.endDate.slice(0, 7), currentMonthStr()].sort()[0];
    if (values.month < minMonth || values.month > maxMonth) {
      errors.month =
        'Tháng lập hóa đơn phải nằm trong thời hạn hợp đồng và không ở tương lai';
    }
    if (
      context.latestMonth &&
      values.month <= context.latestMonth &&
      values.month !== context.editingMonth
    ) {
      errors.month = `Chỉ được lập hóa đơn cho tháng sau ${context.latestMonth
        .split('-')
        .reverse()
        .join('/')}`;
    }
  }

  if (context.firstInvoice) {
    if (!isInteger(values.electricOld) || number(values.electricOld) < 0) {
      errors.electricOld = 'Chỉ số điện cũ phải là số nguyên không âm';
    }
    if (!isInteger(values.waterOld) || number(values.waterOld) < 0) {
      errors.waterOld = 'Chỉ số nước cũ phải là số nguyên không âm';
    }
  }

  const electricOld = Number(context.electricOld ?? values.electricOld);
  const waterOld = Number(context.waterOld ?? values.waterOld);
  if (!isInteger(values.electricNew) || number(values.electricNew) < electricOld) {
    errors.electricNew =
      'Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ';
  }
  if (!isInteger(values.waterNew) || number(values.waterNew) < waterOld) {
    errors.waterNew =
      'Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ';
  }

  if (
    !isInteger(values.electricPrice) ||
    number(values.electricPrice) < 1000 ||
    number(values.electricPrice) > 10000
  ) {
    errors.electricPrice = 'Đơn giá điện phải từ 1.000 đến 10.000 ₫/kWh';
  }
  if (
    !isInteger(values.waterPrice) ||
    number(values.waterPrice) < 5000 ||
    number(values.waterPrice) > 100000
  ) {
    errors.waterPrice = 'Đơn giá nước phải từ 5.000 đến 100.000 ₫/m³';
  }
  if (
    !isInteger(values.otherFee) ||
    number(values.otherFee) < 0 ||
    number(values.otherFee) > 10000000
  ) {
    errors.otherFee = 'Phí khác phải từ 0 đến 10.000.000 ₫';
  }

  const createdDate = context.createdDate || todayStr();
  if (!isValidDateStr(values.dueDate)) {
    errors.dueDate = 'Vui lòng chọn hạn thanh toán';
  } else if (values.dueDate < createdDate) {
    errors.dueDate = 'Hạn thanh toán không được trước ngày lập hóa đơn';
  }

  return errors;
}

export function validatePaymentDate(paidDate, createdDate) {
  if (!isValidDateStr(paidDate) || paidDate < createdDate || paidDate > todayStr()) {
    return 'Ngày thanh toán phải từ ngày lập hóa đơn đến hôm nay';
  }
  return '';
}
