import { Alert, Button, Spinner } from 'react-bootstrap';

export default function DataState({
  loading,
  error,
  onRetry,
  isEmpty,
  emptyMessage = 'Chưa có dữ liệu.',
  children,
}) {
  if (loading) {
    return (
      <div className="py-5 text-center" role="status">
        <Spinner animation="border" aria-label="Đang tải dữ liệu" />
        <p className="mt-2 mb-0">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <p className="mb-2">{error}</p>
        {onRetry && (
          <Button variant="outline-danger" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </Alert>
    );
  }

  if (isEmpty) {
    return <Alert variant="light" className="text-center">{emptyMessage}</Alert>;
  }

  return children;
}
