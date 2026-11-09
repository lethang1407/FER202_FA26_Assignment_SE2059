import { Button, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Container className="py-5 text-center">
      <p className="display-4 fw-semibold">404</p>
      <h1 className="h3">Không tìm thấy trang</h1>
      <p className="text-secondary">Địa chỉ bạn truy cập không tồn tại.</p>
      <Button as={Link} to="/" variant="primary">
        Về trang tổng quan
      </Button>
    </Container>
  );
}
