import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import ConfirmModal from '../../components/common/ConfirmModal';
import FormField from '../../components/common/FormField';
import { roomApi } from '../../api/roomApi';
import { useToast } from '../../context/ToastContext';
import {
  createInvoice,
  getDefaultInvoiceMonth,
  getInvoiceContext,
  getInvoiceFormDefaults,
  updateInvoice,
} from '../../services/invoiceService';
import { calcInvoice } from '../../utils/calcInvoice';
import { currentMonthStr } from '../../utils/date';
import { formatCurrency } from '../../utils/format';
import { validateInvoice } from '../../utils/validators';

function isInteger(value) {
  return value !== '' && Number.isInteger(Number(value));
}

export default function InvoiceFormModal({
  show,
  invoice,
  contracts,
  onSaved,
  onCancel,
}) {
  const { showSuccess } = useToast();
  const [values, setValues] = useState(getInvoiceFormDefaults);
  const [context, setContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showUsageWarning, setShowUsageWarning] = useState(false);
  const requestId = useRef(0);

  const selectedContract = contracts.find(
    (contract) => String(contract.id) === String(values.contractId)
  );
  const selectedRoom = selectedContract?.room;

  const validationContext = useMemo(() => {
    if (!context) return {};
    return {
      ...context,
      contract: context.contract,
      electricOld: context.firstInvoice
        ? values.electricOld
        : context.electricOld,
      waterOld: context.firstInvoice ? values.waterOld : context.waterOld,
    };
  }, [context, values.electricOld, values.waterOld]);

  const errors = useMemo(
    () => validateInvoice(values, validationContext),
    [values, validationContext]
  );

  const preview = useMemo(
    () =>
      calcInvoice({
        roomFee: selectedRoom?.price || invoice?.roomFee || 0,
        ...values,
        electricOld: context?.firstInvoice
          ? values.electricOld
          : context?.electricOld ?? invoice?.electricOld,
        waterOld: context?.firstInvoice
          ? values.waterOld
          : context?.waterOld ?? invoice?.waterOld,
      }),
    [context, invoice, selectedRoom, values]
  );

  const canPreview =
    selectedRoom || invoice?.roomFee
      ? isInteger(values.electricNew) &&
        isInteger(values.waterNew) &&
        isInteger(values.electricPrice) &&
        isInteger(values.waterPrice) &&
        isInteger(values.otherFee) &&
        Number(values.electricNew) >=
          Number(
            context?.firstInvoice
              ? values.electricOld
              : context?.electricOld ?? invoice?.electricOld
          ) &&
        Number(values.waterNew) >=
          Number(
            context?.firstInvoice
              ? values.waterOld
              : context?.waterOld ?? invoice?.waterOld
          )
      : false;

  useEffect(() => {
    if (!show) return undefined;

    requestId.current += 1;
    setContext(null);
    setContextError('');
    setServiceError('');
    setTouched({});
    setSubmitting(false);
    setShowUsageWarning(false);

    if (invoice) {
      const currentContext = {
        contract:
          contracts.find(
            (contract) => String(contract.id) === String(invoice.contractId)
          ) || null,
        firstInvoice: false,
        latestMonth: null,
        createdDate: invoice.createdDate,
        electricOld: invoice.electricOld,
        waterOld: invoice.waterOld,
      };
      setContext(currentContext);
      setValues({
        contractId: String(invoice.contractId),
        month: invoice.month,
        electricOld: String(invoice.electricOld),
        electricNew: String(invoice.electricNew),
        electricPrice: String(invoice.electricPrice),
        waterOld: String(invoice.waterOld),
        waterNew: String(invoice.waterNew),
        waterPrice: String(invoice.waterPrice),
        otherFee: String(invoice.otherFee),
        dueDate: invoice.dueDate,
      });
    } else {
      setValues(getInvoiceFormDefaults());
    }

    return () => {
      requestId.current += 1;
    };
  }, [contracts, invoice, show]);

  useEffect(() => {
    if (!show || invoice || !values.contractId) return undefined;

    const currentRequestId = ++requestId.current;
    setLoadingContext(true);
    setContextError('');
    setContext(null);

    Promise.all([
      getInvoiceContext(values.contractId),
      roomApi.getById(
        contracts.find(
          (contract) => String(contract.id) === String(values.contractId)
        )?.roomId
      ),
    ])
      .then(([nextContext, room]) => {
        if (currentRequestId !== requestId.current) return;
        const month = getDefaultInvoiceMonth(nextContext);
        const firstInvoice = nextContext.firstInvoice;
        setContext({
          ...nextContext,
          contract: nextContext.contract,
          room,
        });
        setValues((current) => ({
          ...current,
          electricOld: firstInvoice ? current.electricOld : String(nextContext.electricOld),
          waterOld: firstInvoice ? current.waterOld : String(nextContext.waterOld),
          month,
        }));
      })
      .catch((error) => {
        if (currentRequestId === requestId.current) {
          setContextError(
            error instanceof Error ? error.message : 'Không thể tải thông tin hợp đồng'
          );
        }
      })
      .finally(() => {
        if (currentRequestId === requestId.current) setLoadingContext(false);
      });

    return () => {
      requestId.current += 1;
    };
  }, [contracts, invoice, show, values.contractId]);

  const changeField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setServiceError('');
  };

  const touchField = (event) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
  };

  const performSave = async () => {
    setSubmitting(true);
    setServiceError('');
    try {
      if (invoice) {
        await updateInvoice(invoice.id, values);
        showSuccess(`Đã cập nhật hóa đơn ${invoice.month}`);
      } else {
        await createInvoice(values);
        showSuccess(`Đã lập hóa đơn ${values.month}`);
      }
      setShowUsageWarning(false);
      await onSaved();
    } catch (error) {
      setServiceError(
        error instanceof Error ? error.message : 'Đã xảy ra lỗi, vui lòng thử lại'
      );
      setShowUsageWarning(false);
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setTouched({
      contractId: true,
      month: true,
      electricOld: true,
      electricNew: true,
      electricPrice: true,
      waterOld: true,
      waterNew: true,
      waterPrice: true,
      otherFee: true,
      dueDate: true,
    });
    setServiceError('');
    if (!context || Object.keys(errors).length > 0) return;

    if (preview.electricUsed > 500 || preview.waterUsed > 50) {
      setShowUsageWarning(true);
      return;
    }
    await performSave();
  };

  const fieldError = (name) => (touched[name] ? errors[name] : undefined);
  const currentMonth = currentMonthStr();

  return (
    <>
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
            <Modal.Title>
              {invoice ? `Sửa hóa đơn ${invoice.month}` : 'Lập hóa đơn'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {serviceError && <Alert variant="danger">{serviceError}</Alert>}
            {contextError && <Alert variant="danger">{contextError}</Alert>}
            {!invoice && !contracts.length && (
              <Alert variant="info">
                Chưa có hợp đồng đang hiệu lực để lập hóa đơn.
              </Alert>
            )}
            {loadingContext && <Alert variant="info">Đang tải chỉ số và hợp đồng...</Alert>}
            {context && !invoice && !getDefaultInvoiceMonth(context) && (
              <Alert variant="info">
                Đã lập hóa đơn đến tháng hiện tại hoặc đã hết thời hạn hợp đồng.
              </Alert>
            )}
            <Row>
              {!invoice && (
                <Col xs={12}>
                  <FormField
                    id="invoice-contract"
                    label="Hợp đồng"
                    required
                    error={fieldError('contractId')}
                  >
                    <Form.Select
                      autoFocus
                      name="contractId"
                      value={values.contractId}
                      onChange={changeField}
                      onBlur={touchField}
                      isInvalid={Boolean(fieldError('contractId'))}
                      disabled={submitting || loadingContext}
                    >
                      <option value="">Chọn hợp đồng đang hiệu lực</option>
                      {contracts.map((contract) => (
                        <option value={contract.id} key={contract.id}>
                          {contract.room?.name || `#${contract.roomId}`} —{' '}
                          {contract.tenant?.fullName || `#${contract.tenantId}`}
                        </option>
                      ))}
                    </Form.Select>
                  </FormField>
                </Col>
              )}
              {invoice && (
                <Col xs={12}>
                  <Alert variant="light">
                    Hợp đồng #{invoice.contractId} · Phòng{' '}
                    {invoice.room?.name || `#${invoice.roomId}`}
                  </Alert>
                </Col>
              )}
              <Col md={6}>
                <FormField
                  id="invoice-month"
                  label="Tháng"
                  required
                  error={fieldError('month')}
                >
                  <Form.Control
                    type="month"
                    name="month"
                    min={context?.contract?.startDate?.slice(0, 7)}
                    max={
                      context?.contract
                        ? [context.contract.endDate.slice(0, 7), currentMonth].sort()[0]
                        : currentMonth
                    }
                    value={values.month}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('month'))}
                    disabled={submitting || Boolean(invoice) || loadingContext}
                  />
                </FormField>
              </Col>
              <Col md={6}>
                <FormField
                  id="invoice-due-date"
                  label="Hạn thanh toán"
                  required
                  error={fieldError('dueDate')}
                >
                  <Form.Control
                    type="date"
                    name="dueDate"
                    value={values.dueDate}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('dueDate'))}
                    disabled={submitting}
                  />
                </FormField>
              </Col>
              <Col md={6}>
                <FormField
                  id="invoice-electric-old"
                  label="Chỉ số điện cũ (kWh)"
                  required
                  error={fieldError('electricOld')}
                >
                  <Form.Control
                    type="number"
                    min="0"
                    step="1"
                    name="electricOld"
                    value={values.electricOld}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('electricOld'))}
                    disabled={
                      submitting || Boolean(invoice) || Boolean(context && !context.firstInvoice)
                    }
                  />
                </FormField>
              </Col>
              <Col md={6}>
                <FormField
                  id="invoice-electric-new"
                  label="Chỉ số điện mới (kWh)"
                  required
                  error={fieldError('electricNew')}
                >
                  <Form.Control
                    type="number"
                    min="0"
                    step="1"
                    name="electricNew"
                    value={values.electricNew}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('electricNew'))}
                    disabled={submitting || loadingContext}
                  />
                </FormField>
              </Col>
              <Col md={6}>
                <FormField
                  id="invoice-electric-price"
                  label="Đơn giá điện (₫/kWh)"
                  required
                  error={fieldError('electricPrice')}
                >
                  <Form.Control
                    type="number"
                    min="1000"
                    max="10000"
                    step="1"
                    name="electricPrice"
                    value={values.electricPrice}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('electricPrice'))}
                    disabled={submitting}
                  />
                </FormField>
              </Col>
              <Col md={6}>
                <FormField
                  id="invoice-water-old"
                  label="Chỉ số nước cũ (m³)"
                  required
                  error={fieldError('waterOld')}
                >
                  <Form.Control
                    type="number"
                    min="0"
                    step="1"
                    name="waterOld"
                    value={values.waterOld}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('waterOld'))}
                    disabled={
                      submitting || Boolean(invoice) || Boolean(context && !context.firstInvoice)
                    }
                  />
                </FormField>
              </Col>
              <Col md={6}>
                <FormField
                  id="invoice-water-new"
                  label="Chỉ số nước mới (m³)"
                  required
                  error={fieldError('waterNew')}
                >
                  <Form.Control
                    type="number"
                    min="0"
                    step="1"
                    name="waterNew"
                    value={values.waterNew}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('waterNew'))}
                    disabled={submitting || loadingContext}
                  />
                </FormField>
              </Col>
              <Col md={6}>
                <FormField
                  id="invoice-water-price"
                  label="Đơn giá nước (₫/m³)"
                  required
                  error={fieldError('waterPrice')}
                >
                  <Form.Control
                    type="number"
                    min="5000"
                    max="100000"
                    step="1"
                    name="waterPrice"
                    value={values.waterPrice}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('waterPrice'))}
                    disabled={submitting}
                  />
                </FormField>
              </Col>
              <Col md={6}>
                <FormField
                  id="invoice-other-fee"
                  label="Phí khác (₫)"
                  required
                  error={fieldError('otherFee')}
                >
                  <Form.Control
                    type="number"
                    min="0"
                    max="10000000"
                    step="1"
                    name="otherFee"
                    value={values.otherFee}
                    onChange={changeField}
                    onBlur={touchField}
                    isInvalid={Boolean(fieldError('otherFee'))}
                    disabled={submitting}
                  />
                </FormField>
              </Col>
            </Row>
            <Alert variant="light" className="mb-0">
              <div className="d-flex justify-content-between gap-3">
                <span>Tiền phòng</span>
                <span>{formatCurrency(selectedRoom?.price || invoice?.roomFee || 0)}</span>
              </div>
              {canPreview ? (
                <>
                  <div className="d-flex justify-content-between gap-3">
                    <span>
                      Điện ({preview.electricUsed} kWh ×{' '}
                      {formatCurrency(values.electricPrice)})
                    </span>
                    <span>{formatCurrency(preview.electricAmount)}</span>
                  </div>
                  <div className="d-flex justify-content-between gap-3">
                    <span>
                      Nước ({preview.waterUsed} m³ ×{' '}
                      {formatCurrency(values.waterPrice)})
                    </span>
                    <span>{formatCurrency(preview.waterAmount)}</span>
                  </div>
                  <div className="d-flex justify-content-between gap-3">
                    <span>Phí khác</span>
                    <span>{formatCurrency(values.otherFee)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between fw-semibold">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(preview.total)}</span>
                  </div>
                </>
              ) : (
                <div className="d-flex justify-content-between gap-3">
                  <span>Tổng cộng</span>
                  <span>—</span>
                </div>
              )}
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingContext || Boolean(contextError)}
            >
              {submitting && <Spinner size="sm" className="me-2" />}
              {submitting ? 'Đang lưu...' : invoice ? 'Lưu thay đổi' : 'Lập hóa đơn'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={showUsageWarning}
        title="Xác nhận mức tiêu thụ"
        message={`Mức tiêu thụ bất thường (${preview.electricUsed} kWh / ${preview.waterUsed} m³). Bạn có chắc đã nhập đúng?`}
        confirmText={invoice ? 'Xác nhận lưu hóa đơn' : 'Xác nhận lập hóa đơn'}
        variant="warning"
        onConfirm={performSave}
        onCancel={() => setShowUsageWarning(false)}
      />
    </>
  );
}
