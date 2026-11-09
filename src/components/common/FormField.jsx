import { Form } from 'react-bootstrap';

export default function FormField({ id, label, required = false, error, children }) {
  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label>
        {label}
        {required && <span className="text-danger"> *</span>}
      </Form.Label>
      {children}
      {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
    </Form.Group>
  );
}
