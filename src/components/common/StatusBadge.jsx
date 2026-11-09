import { Badge } from 'react-bootstrap';

const STATUS_LABELS = {
  room: {
    available: ['Trống', 'success'],
    occupied: ['Đang thuê', 'primary'],
    maintenance: ['Đang sửa', 'warning'],
  },
  contract: {
    active: ['Hiệu lực', 'success'],
    expiring: ['Sắp hết hạn', 'warning'],
    expired: ['Quá hạn thanh lý', 'danger'],
    ended: ['Đã kết thúc', 'secondary'],
  },
  invoice: {
    paid: ['Đã thanh toán', 'success'],
    unpaid: ['Chưa thanh toán', 'warning'],
    overdue: ['Quá hạn', 'danger'],
  },
};

export default function StatusBadge({ type, value }) {
  const [label, variant] = STATUS_LABELS[type]?.[value] || [
    value || 'Không xác định',
    'secondary',
  ];

  return (
    <Badge bg={variant} text={variant === 'warning' ? 'dark' : undefined}>
      {label}
    </Badge>
  );
}
