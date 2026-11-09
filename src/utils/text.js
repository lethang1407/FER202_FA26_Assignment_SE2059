export const normalize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

export const cleanSpaces = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
