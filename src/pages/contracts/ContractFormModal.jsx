import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import FormField from '../../components/common/FormField';
import { addMonths, todayStr } from '../../utils/date';
import { formatCurrency } from '../../utils/format';
import {
  validateContractCreate,
  validateContractUpdate,
} from '../../utils/validators';

function createValues(contract) {
  if (contract) {
    return {
      roomId: String(contract.roomId),
      tenantId: String(contract.tenantId),
      startDate: contract.startDate,
      endDate: contract.endDate,
      deposit: String(contract.deposit),
    };
  }

  const startDate = todayStr();
  return {
    roomId: '',
    tenantId: '',
    startDate,
    endDate: addMonths(startDate, 12),
    deposit: '',
  };
}

export default function ContractFormModal({
  show,
  contract,
  rooms,
  tenants,
  onSave,
  onCancel,
}) {
  const [values, setValues] = useState(() => createValues(contract));
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const selectedRoom = rooms.find(
    (room) => String(room.id) === String(values.roomId)
  );
  const errors = useMemo(
    () =>
      contract
        ? validateContractUpdate(values, contract, selectedRoom || contract.room)
        : validateContractCreate(values, selectedRoom),
    [contract, selectedRoom, values]
  );

  useEffect(() => {
    if (show) {
      setValues(createValues(contract));
      setTouched({});
      setServiceError('');
      setSubmitting(false);
    }
  }, [contract, show]);

  const changeField = (event) => {
    const { name, value } = event.target;
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name === 'roomId' && !contract) {
        const room = rooms.find((item) => String(item.id) === String(value));
        next.deposit = room ? String(room.price) : '';
      }
      if (name === 'startDate' && !contract && value) {
        next.endDate = addMonths(value, 12);
      }
      return next;
    });
    setServiceError('');
  };

  const touchField = (event) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setTouched({
      roomId: true,
      tenantId: true,
      startDate: true,
      endDate: true,
      deposit: true,
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
      backdrop={submitting ? 'static' : true}
      keyboard={!submitting}
    >
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title>
            {contract ? `Sửa hợp đồng #${contract.id}` : 'Tạo hợp đồng'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {serviceError && <Alert variant="danger">{serviceError}</Alert>}
          <Row>
            {!contract && (
              <>
                <Col xs={12}>
                  <FormField
                    id="contract-room"
                    label="Phòng"
                    required
                    error={fieldError('roomId')}
                  >
                    <Form.Select
                      autoFocus
                      name="roomId"
                      value={values.roomId}
                      onChange={changeField}
                      onBlur={touchField}
                      isInvalid={Boolean(fieldError('roomId'))}
                      disabled={submitting}
                    >
                      <option value="">Chọn phòng trống</option>
                      {rooms.map((room) => (
                        <option value={room.id} key={room.id}>
                          {room.name} — {formatCurrency(room.price)}
                        </option>
                      ))}
                    </Form.Select>
                  </FormField>
                </Col>
                <Col xs={12}>
                  <FormField
                    id="contract-tenant"
                    label="Người thuê đại diện"
                    required
                    error={fieldError('tenantId')}
                  >
                    <Form.Select
                      name="tenantId"
                      value={values.tenantId}
                      onChange={changeField}
                      onBlur={touchField}
                      isInvalid={Boolean(fieldError('tenantId'))}
                      disabled={submitting}
                    >
                      <option value="">Chọn người thuê</option>
                      {tenants.map((tenant) => (
                        <option value={tenant.id} key={tenant.id}>
                          {tenant.fullName} — {tenant.phone}
                        </option>
                      ))}
                    </Form.Select>
                  </FormField>
                </Col>
              </>
            )}
            {contract && (
              <Col xs={12}>
                <Alert variant="light" className="mb-3">
                  Phòng <strong>{contract.room?.name || `#${contract.roomId}`}</strong>
                  {' · '}
                  Người thuê <strong>{contract.tenant?.fullName || `#${contract.tenantId}`}</strong>
                  <div className="small text-secondary mt-1">
                    Ngày bắt đầu: {contract.startDate}
                  </div>
                </Alert>
              </Col>
            )}
            {!contract && (
              <Col md={6}>
                <FormField
                  id="contract-start-date"
                  label="Ngày bắt đầu"
                  required
                  error={fieldError('startDate')}
                >
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={values.startDate}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('startDate'))}
                    disabled={submitting}
                  />
                </FormField>
              </Col>
            )}
            <Col md={contract ? 6 : 6}>
              <FormField
                id="contract-end-date"
                label="Ngày kết thúc"
                required
                error={fieldError('endDate')}
              >
                <Form.Control
                  type="date"
                  name="endDate"
                  value={values.endDate}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('endDate'))}
                  disabled={submitting}
                />
              </FormField>
            </Col>
            <Col md={contract ? 6 : 6}>
              <FormField
                id="contract-deposit"
                label="Tiền cọc (₫)"
                required
                error={fieldError('deposit')}
              >
                <Form.Control
                  type="number"
                  name="deposit"
                  min="0"
                  step="1"
                  value={values.deposit}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('deposit'))}
                  disabled={submitting}
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
            {submitting ? 'Đang lưu...' : contract ? 'Lưu thay đổi' : 'Tạo hợp đồng'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
