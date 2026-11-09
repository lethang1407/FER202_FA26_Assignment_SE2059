import { Container } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';
import AppNavbar from './AppNavbar';

export default function AppLayout() {
  return (
    <>
      <AppNavbar />
      <main className="py-4 py-lg-5">
        <Container>
          <Outlet />
        </Container>
      </main>
    </>
  );
}
