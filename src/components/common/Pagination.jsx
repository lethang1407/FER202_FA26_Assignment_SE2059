import { Pagination as BootstrapPagination } from 'react-bootstrap';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const items = [];
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    items.push(
      <BootstrapPagination.Item
        key={pageNumber}
        active={pageNumber === page}
        onClick={() => onPageChange(pageNumber)}
        aria-label={`Trang ${pageNumber}`}
      >
        {pageNumber}
      </BootstrapPagination.Item>
    );
  }

  return (
    <BootstrapPagination className="mb-0" aria-label="Phân trang danh sách">
      <BootstrapPagination.Prev
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Trang trước"
      />
      {items}
      <BootstrapPagination.Next
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Trang sau"
      />
    </BootstrapPagination>
  );
}
