const numberOrZero = (value) => Number(value) || 0;

export function calcInvoice(invoice) {
  const electricUsed = numberOrZero(invoice.electricNew) - numberOrZero(invoice.electricOld);
  const waterUsed = numberOrZero(invoice.waterNew) - numberOrZero(invoice.waterOld);
  const electricAmount = electricUsed * numberOrZero(invoice.electricPrice);
  const waterAmount = waterUsed * numberOrZero(invoice.waterPrice);
  const total =
    numberOrZero(invoice.roomFee) +
    electricAmount +
    waterAmount +
    numberOrZero(invoice.otherFee);

  return { electricUsed, waterUsed, electricAmount, waterAmount, total };
}
