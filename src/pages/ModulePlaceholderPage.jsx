import { Alert } from 'react-bootstrap';
import PageHeader from '../components/common/PageHeader';

export default function ModulePlaceholderPage({ title, description }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Alert variant="info">
        Nền tảng đăng nhập và điều hướng đã sẵn sàng. Chức năng quản lý mục này sẽ
        được triển khai ở giai đoạn tiếp theo.
      </Alert>
    </>
  );
}
