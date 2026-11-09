import { useState } from 'react';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';

export default function ConfirmModal({
  show,
  title,
  message,
  confirmText = 'Xác nhận',
  variant = 'primary',
  onConfirm,
  onCancel,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setSubmitting(true);
    setError('');

    try {
      await onConfirm();
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : 'Đã xảy ra lỗi, vui lòng thử lại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={submitting ? undefined : onCancel}
      centered
      backdrop={submitting ? 'static' : true}
      keyboard={!submitting}
    >
      <Modal.Header closeButton={!submitting}>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {message}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={submitting}>
          Hủy
        </Button>
        <Button variant={variant} onClick={confirm} disabled={submitting}>
          {submitting && <Spinner size="sm" className="me-2" />}
          {submitting ? 'Đang xử lý...' : confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
