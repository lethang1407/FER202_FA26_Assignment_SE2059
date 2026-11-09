import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import FormField from '../../components/common/FormField';
import { ROOM_STATUS } from '../../utils/constants';
import { validateRoom } from '../../utils/validators';

const EMPTY_VALUES = {
  name: '',
  floor: '',
  area: '',
  price: '',
  status: ROOM_STATUS.AVAILABLE,
  description: '',
};

function toValues(room) {
  if (!room) return { ...EMPTY_VALUES };

  return {
    name: room.name ?? '',
    floor: String(room.floor ?? ''),
    area: String(room.area ?? ''),
    price: String(room.price ?? ''),
    status: room.status,
    description: room.description ?? '',
  };
}

export default function RoomFormModal({
  show,
  room,
  rooms,
  onSave,
  onCancel,
}) {
  const [values, setValues] = useState(() => toValues(room));
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const errors = useMemo(
    () => validateRoom(values, rooms, room?.id ?? null),
    [values, rooms, room]
  );

  useEffect(() => {
    if (show) {
      setValues(toValues(room));
      setTouched({});
      setServiceError('');
      setSubmitting(false);
    }
  }, [show, room]);

  const changeField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setServiceError('');
  };

  const touchField = (event) => {
    const { name } = event.target;
    setTouched((current) => ({ ...current, [name]: true }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setTouched({
      name: true,
      floor: true,
      area: true,
      price: true,
      status: true,
      description: true,
    });
    setServiceError('');
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await onSave(values);
    } catch (error) {
      setServiceError(
        error instanceof Error ? error.message : 'Đã xảy ra lỗi, vui lòng thử lại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (name) => (touched[name] ? errors[name] : undefined);

  return (
    <Modal
      show={show}
      onHide={submitting ? undefined : onCancel}
      centered
      size="lg"
      backdrop={submitting ? 'static' : true}
      keyboard={!submitting}
    >
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title>{room ? `Sửa phòng ${room.name}` : 'Thêm phòng'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {serviceError && <Alert variant="danger">{serviceError}</Alert>}
          <Row>
            <Col md={6}>
              <FormField id="room-name" label="Tên phòng" required error={fieldError('name')}>
                <Form.Control
                  autoFocus
                  name="name"
                  value={values.name}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('name'))}
                  disabled={submitting}
                  maxLength={20}
                />
              </FormField>
            </Col>
            <Col md={6}>
              <FormField id="room-floor" label="Tầng" required error={fieldError('floor')}>
                <Form.Control
                  type="number"
                  name="floor"
                  min="1"
                  max="50"
                  step="1"
                  value={values.floor}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('floor'))}
                  disabled={submitting}
                />
              </FormField>
            </Col>
            <Col md={6}>
              <FormField id="room-area" label="Diện tích (m²)" required error={fieldError('area')}>
                <Form.Control
                  type="number"
                  name="area"
                  min="0.01"
                  max="200"
                  step="any"
                  value={values.area}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('area'))}
                  disabled={submitting}
                />
              </FormField>
            </Col>
            <Col md={6}>
              <FormField id="room-price" label="Giá thuê/tháng (₫)" required error={fieldError('price')}>
                <Form.Control
                  type="number"
                  name="price"
                  min="100000"
                  max="100000000"
                  step="1"
                  value={values.price}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('price'))}
                  disabled={submitting}
                />
              </FormField>
            </Col>
            <Col md={6}>
              <FormField id="room-status" label="Trạng thái" required error={fieldError('status')}>
                <Form.Select
                  name="status"
                  value={values.status}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('status'))}
                  disabled={submitting || room?.status === ROOM_STATUS.OCCUPIED}
                >
                  {room?.status === ROOM_STATUS.OCCUPIED && (
                    <option value={ROOM_STATUS.OCCUPIED}>Đang thuê</option>
                  )}
                  <option value={ROOM_STATUS.AVAILABLE}>Trống</option>
                  <option value={ROOM_STATUS.MAINTENANCE}>Đang sửa</option>
                </Form.Select>
                {room?.status === ROOM_STATUS.OCCUPIED && (
                  <Form.Text className="text-secondary">
                    Kết thúc hợp đồng trước khi thay đổi trạng thái phòng.
                  </Form.Text>
                )}
              </FormField>
            </Col>
            <Col md={6}>
              <FormField id="room-description" label="Mô tả" error={fieldError('description')}>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  value={values.description}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('description'))}
                  disabled={submitting}
                  maxLength={201}
                />
              </FormField>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner size="sm" className="me-2" />}
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
