import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import FormField from '../../components/common/FormField';
import { validateTenant } from '../../utils/validators';

const EMPTY_VALUES = {
  fullName: '',
  phone: '',
  idCard: '',
  hometown: '',
};

function toValues(tenant) {
  if (!tenant) return { ...EMPTY_VALUES };
  return {
    fullName: tenant.fullName ?? '',
    phone: String(tenant.phone ?? ''),
    idCard: String(tenant.idCard ?? ''),
    hometown: tenant.hometown ?? '',
  };
}

export default function TenantFormModal({
  show,
  tenant,
  tenants,
  onSave,
  onCancel,
}) {
  const [values, setValues] = useState(() => toValues(tenant));
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const errors = useMemo(
    () => validateTenant(values, tenants, tenant?.id ?? null),
    [values, tenants, tenant]
  );

  useEffect(() => {
    if (show) {
      setValues(toValues(tenant));
      setTouched({});
      setServiceError('');
      setSubmitting(false);
    }
  }, [show, tenant]);

  const changeField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setServiceError('');
  };

  const touchField = (event) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setTouched({
      fullName: true,
      phone: true,
      idCard: true,
      hometown: true,
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
            {tenant ? `Sửa người thuê ${tenant.fullName}` : 'Thêm người thuê'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {serviceError && <Alert variant="danger">{serviceError}</Alert>}
          <Row>
            <Col xs={12}>
              <FormField
                id="tenant-full-name"
                label="Họ tên"
                required
                error={fieldError('fullName')}
              >
                <Form.Control
                  autoFocus
                  name="fullName"
                  value={values.fullName}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('fullName'))}
                  disabled={submitting}
                  maxLength={51}
                  autoComplete="name"
                />
              </FormField>
            </Col>
            <Col md={6}>
              <FormField
                id="tenant-phone"
                label="Số điện thoại"
                required
                error={fieldError('phone')}
              >
                <Form.Control
                  type="text"
                  inputMode="numeric"
                  name="phone"
                  value={values.phone}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('phone'))}
                  disabled={submitting}
                  maxLength={10}
                  autoComplete="tel"
                />
              </FormField>
            </Col>
            <Col md={6}>
              <FormField
                id="tenant-id-card"
                label="CCCD"
                required
                error={fieldError('idCard')}
              >
                <Form.Control
                  type="text"
                  inputMode="numeric"
                  name="idCard"
                  value={values.idCard}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('idCard'))}
                  disabled={submitting}
                  maxLength={12}
                  autoComplete="off"
                />
              </FormField>
            </Col>
            <Col xs={12}>
              <FormField
                id="tenant-hometown"
                label="Quê quán"
                required
                error={fieldError('hometown')}
              >
                <Form.Control
                  name="hometown"
                  value={values.hometown}
                  onChange={changeField}
                  onBlur={touchField}
                  isInvalid={Boolean(fieldError('hometown'))}
                  disabled={submitting}
                  maxLength={101}
                  autoComplete="address-level2"
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
