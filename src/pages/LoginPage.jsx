import { useState } from 'react';
import { Alert, Button, Card, Container, Form, Spinner } from 'react-bootstrap';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }

    setSubmitting(true);
    try {
      await login(username, password);
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Đã xảy ra lỗi, vui lòng thử lại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page d-flex align-items-center py-5">
      <Container>
        <Card className="login-card border-0 shadow mx-auto">
          <Card.Body className="p-4 p-md-5">
            <p className="text-primary fw-semibold mb-2">QUẢN LÝ NHÀ TRỌ</p>
            <h1 className="h3 mb-2">Đăng nhập</h1>
            <p className="text-secondary mb-4">
              Đăng nhập bằng tài khoản quản trị để tiếp tục.
            </p>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={submit}>
              <Form.Group className="mb-3" controlId="username">
                <Form.Label>Tên đăng nhập</Form.Label>
                <Form.Control
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={submitting}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-4" controlId="password">
                <Form.Label>Mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  required
                />
              </Form.Group>
              <Button type="submit" className="w-100" disabled={submitting}>
                {submitting && <Spinner size="sm" className="me-2" />}
                {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </main>
  );
}
